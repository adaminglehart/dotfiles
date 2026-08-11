package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

const claimStaleAfter = 2 * time.Minute

var environmentName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type Config struct {
	Version         int                   `yaml:"version"`
	DirectoryPicker DirectoryPickerConfig `yaml:"directory_picker"`
	Layout          LayoutConfig          `yaml:"layout"`
}

type DirectoryPickerConfig struct {
	Roots []string `yaml:"roots"`
}

type LayoutConfig struct {
	Tabs []TabConfig `yaml:"tabs"`
}

type TabConfig struct {
	Label string       `yaml:"label"`
	Panes []PaneConfig `yaml:"panes"`
}

type PaneConfig struct {
	Label   string            `yaml:"label"`
	Split   string            `yaml:"split"`
	Size    PaneSize          `yaml:"size"`
	Command []string          `yaml:"command"`
	Env     map[string]string `yaml:"env"`
}

type PaneSize struct {
	value float64
	set   bool
}

func (size *PaneSize) UnmarshalYAML(node *yaml.Node) error {
	if node.Kind != yaml.ScalarNode {
		return fmt.Errorf("size must be a fraction or percentage")
	}
	var value float64
	var err error
	switch node.Tag {
	case "!!float":
		value, err = strconv.ParseFloat(node.Value, 64)
	case "!!str":
		if !strings.HasSuffix(node.Value, "%") {
			return fmt.Errorf("size %q must end in %%", node.Value)
		}
		value, err = strconv.ParseFloat(strings.TrimSuffix(node.Value, "%"), 64)
		value /= 100
	default:
		return fmt.Errorf("size must be a fraction or percentage")
	}
	if err != nil || value <= 0 || value >= 1 {
		return fmt.Errorf("size must be greater than 0 and less than 1")
	}
	size.value = value
	size.set = true
	return nil
}

func (size PaneSize) ratio() float64 {
	if size.set {
		return 1 - size.value
	}
	return 0.5
}

func configPath() (string, error) {
	if path := os.Getenv("HERDR_GLOBAL_LAYOUT_CONFIG"); path != "" {
		return expandHome(path)
	}
	if root := os.Getenv("HERDR_PLUGIN_ROOT"); root != "" {
		return filepath.Join(filepath.Dir(filepath.Dir(root)), "global-layout.yaml"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "herdr", "global-layout.yaml"), nil
}

func expandHome(value string) (string, error) {
	if value != "~" && !strings.HasPrefix(value, "~/") {
		return value, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, strings.TrimPrefix(value, "~/")), nil
}

func loadConfig() (Config, error) {
	var config Config
	path, err := configPath()
	if err != nil {
		return config, err
	}
	file, err := os.Open(path)
	if err != nil {
		return config, fmt.Errorf("open %s: %w", path, err)
	}
	defer file.Close()
	decoder := yaml.NewDecoder(file)
	decoder.KnownFields(true)
	if err := decoder.Decode(&config); err != nil {
		return config, fmt.Errorf("parse %s: %w", path, err)
	}
	var extra yaml.Node
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return config, fmt.Errorf("%s must contain one YAML document", path)
	}
	return config, validateConfig(config)
}

func validateConfig(config Config) error {
	if config.Version != 1 {
		return fmt.Errorf("version must be 1")
	}
	if len(config.DirectoryPicker.Roots) == 0 {
		return fmt.Errorf("directory_picker.roots must contain at least one path")
	}
	for index, root := range config.DirectoryPicker.Roots {
		if strings.TrimSpace(root) == "" || strings.ContainsRune(root, '\n') {
			return fmt.Errorf("directory_picker.roots[%d] must be a non-empty path", index)
		}
	}
	if len(config.Layout.Tabs) == 0 {
		return fmt.Errorf("layout.tabs must contain at least one tab")
	}
	for tabIndex, tab := range config.Layout.Tabs {
		if strings.TrimSpace(tab.Label) == "" {
			return fmt.Errorf("layout.tabs[%d].label must be non-empty", tabIndex)
		}
		if len(tab.Panes) == 0 {
			return fmt.Errorf("layout.tabs[%d].panes must contain at least one pane", tabIndex)
		}
		for paneIndex, pane := range tab.Panes {
			if paneIndex == 0 && (pane.Split != "" || pane.Size.set) {
				return fmt.Errorf("layout.tabs[%d].panes[0] cannot set split or size", tabIndex)
			}
			if paneIndex > 0 && pane.Split != "right" && pane.Split != "down" {
				return fmt.Errorf("layout.tabs[%d].panes[%d].split must be right or down", tabIndex, paneIndex)
			}
			for commandIndex, argument := range pane.Command {
				if argument == "" || strings.ContainsRune(argument, '\x00') {
					return fmt.Errorf("layout.tabs[%d].panes[%d].command[%d] must be non-empty", tabIndex, paneIndex, commandIndex)
				}
			}
			for key, value := range pane.Env {
				if !environmentName.MatchString(key) || strings.ContainsRune(value, '\x00') {
					return fmt.Errorf("layout.tabs[%d].panes[%d].env contains an invalid value", tabIndex, paneIndex)
				}
			}
		}
	}
	return nil
}

type SocketClient struct{ Path string }

type apiRequest struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type apiResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *apiError       `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (client SocketClient) call(method string, params []byte) (json.RawMessage, error) {
	connection, err := net.DialTimeout("unix", client.Path, 5*time.Second)
	if err != nil {
		return nil, err
	}
	defer connection.Close()
	_ = connection.SetDeadline(time.Now().Add(10 * time.Second))
	request, err := json.Marshal(apiRequest{ID: fmt.Sprintf("global-layout-%d", time.Now().UnixNano()), Method: method, Params: params})
	if err != nil {
		return nil, err
	}
	if _, err := connection.Write(append(request, '\n')); err != nil {
		return nil, err
	}
	line, err := bufio.NewReader(connection).ReadBytes('\n')
	if err != nil {
		return nil, err
	}
	var response apiResponse
	if err := json.Unmarshal(line, &response); err != nil {
		return nil, err
	}
	if response.Error != nil {
		return nil, fmt.Errorf("%s: %s", response.Error.Code, response.Error.Message)
	}
	return response.Result, nil
}

type Snapshot struct {
	Workspaces []WorkspaceInfo `json:"workspaces"`
	Tabs       []TabInfo       `json:"tabs"`
	Panes      []PaneInfo      `json:"panes"`
}

type WorkspaceInfo struct {
	ID          string `json:"workspace_id"`
	ActiveTabID string `json:"active_tab_id"`
	TabCount    int    `json:"tab_count"`
	PaneCount   int    `json:"pane_count"`
}

type TabInfo struct {
	ID          string `json:"tab_id"`
	WorkspaceID string `json:"workspace_id"`
}

type PaneInfo struct {
	WorkspaceID string `json:"workspace_id"`
	TabID       string `json:"tab_id"`
	CWD         string `json:"cwd"`
}

type snapshotResult struct {
	Snapshot Snapshot `json:"snapshot"`
}

func (client SocketClient) snapshot() (Snapshot, error) {
	var result snapshotResult
	raw, err := client.call("session.snapshot", []byte("{}"))
	if err != nil {
		return Snapshot{}, err
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return Snapshot{}, err
	}
	return result.Snapshot, nil
}

type LayoutNode struct {
	Type      string            `json:"type"`
	Label     string            `json:"label,omitempty"`
	CWD       string            `json:"cwd,omitempty"`
	Command   []string          `json:"command,omitempty"`
	Env       map[string]string `json:"env,omitempty"`
	Direction string            `json:"direction,omitempty"`
	Ratio     float64           `json:"ratio,omitempty"`
	First     *LayoutNode       `json:"first,omitempty"`
	Second    *LayoutNode       `json:"second,omitempty"`
}

type layoutApplyParams struct {
	WorkspaceID string      `json:"workspace_id,omitempty"`
	TabID       string      `json:"tab_id,omitempty"`
	TabLabel    string      `json:"tab_label"`
	Focus       bool        `json:"focus"`
	Root        *LayoutNode `json:"root"`
}

func buildRoot(tab TabConfig, cwd string) *LayoutNode {
	root := paneNode(tab.Panes[0], cwd)
	last := root
	for _, pane := range tab.Panes[1:] {
		previous := *last
		second := paneNode(pane, cwd)
		*last = LayoutNode{Type: "split", Direction: pane.Split, Ratio: pane.Size.ratio(), First: &previous, Second: second}
		last = second
	}
	return root
}

func paneNode(pane PaneConfig, cwd string) *LayoutNode {
	return &LayoutNode{Type: "pane", Label: pane.Label, CWD: cwd, Command: pane.Command, Env: pane.Env}
}

type workspaceContext struct {
	Workspace WorkspaceInfo
	CWD       string
}

func freshWorkspace(snapshot Snapshot, workspaceID string) (workspaceContext, bool) {
	for _, workspace := range snapshot.Workspaces {
		if workspace.ID != workspaceID {
			continue
		}
		if workspace.TabCount != 1 || workspace.PaneCount != 1 {
			return workspaceContext{}, false
		}
		for _, pane := range snapshot.Panes {
			if pane.WorkspaceID == workspaceID && pane.TabID == workspace.ActiveTabID && pane.CWD != "" {
				return workspaceContext{Workspace: workspace, CWD: pane.CWD}, true
			}
		}
	}
	return workspaceContext{}, false
}

type State struct {
	directory string
	prefix    string
}

func newState(socketPath string) (State, error) {
	directory := os.Getenv("HERDR_PLUGIN_STATE_DIR")
	if directory == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return State{}, err
		}
		directory = filepath.Join(home, ".local", "state", "herdr", "global-space-layout")
	}
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return State{}, err
	}
	return State{directory: directory, prefix: shortHash(socketPath)}, nil
}

func shortHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:8])
}

func (state State) knownPath() string {
	return filepath.Join(state.directory, "known-"+state.prefix+".json")
}
func (state State) markerPath(kind string, workspaceID string) string {
	return filepath.Join(state.directory, kind+"-"+state.prefix+"-"+shortHash(workspaceID))
}

func (state State) recordKnown(ids []string) error {
	known := make(map[string]bool, len(ids))
	for _, id := range ids {
		known[id] = true
	}
	data, err := json.Marshal(known)
	if err != nil {
		return err
	}
	temporary := state.knownPath() + ".new"
	if err := os.WriteFile(temporary, data, 0o600); err != nil {
		return err
	}
	return os.Rename(temporary, state.knownPath())
}

func (state State) hasKnown(id string) bool {
	data, err := os.ReadFile(state.knownPath())
	if err != nil {
		return false
	}
	known := map[string]bool{}
	return json.Unmarshal(data, &known) == nil && known[id]
}

func (state State) initialized() bool { _, err := os.Stat(state.knownPath()); return err == nil }
func (state State) applied(id string) bool {
	_, err := os.Stat(state.markerPath("applied", id))
	return err == nil
}

func (state State) acquire(id string) (func(bool), bool, error) {
	if state.applied(id) {
		return func(bool) {}, false, nil
	}
	claim := state.markerPath("claim", id)
	file, err := os.OpenFile(claim, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		if os.IsExist(err) {
			if info, statErr := os.Stat(claim); statErr == nil && time.Since(info.ModTime()) > claimStaleAfter {
				_ = os.Remove(claim)
				return state.acquire(id)
			}
			return func(bool) {}, false, nil
		}
		return nil, false, err
	}
	_ = file.Close()
	return func(success bool) {
		if success {
			_ = os.Rename(claim, state.markerPath("applied", id))
			return
		}
		_ = os.Remove(claim)
	}, true, nil
}

type eventPayload struct {
	WorkspaceID string          `json:"workspace_id"`
	Workspace   WorkspaceInfo   `json:"workspace"`
	Event       json.RawMessage `json:"event"`
	Data        *eventPayload   `json:"data"`
}

func eventWorkspaceID(raw string) (string, error) {
	var event eventPayload
	if err := json.Unmarshal([]byte(raw), &event); err != nil {
		return "", err
	}
	for current := &event; current != nil; current = nextEvent(current) {
		if current.WorkspaceID != "" {
			return current.WorkspaceID, nil
		}
		if current.Workspace.ID != "" {
			return current.Workspace.ID, nil
		}
	}
	return "", errors.New("event has no workspace id")
}

func nextEvent(event *eventPayload) *eventPayload {
	return event.Data
}

func applyWorkspace(client SocketClient, state State, config Config, workspaceID string) error {
	snapshot, err := client.snapshot()
	if err != nil {
		return err
	}
	context, fresh := freshWorkspace(snapshot, workspaceID)
	if !fresh {
		return nil
	}
	finish, acquired, err := state.acquire(workspaceID)
	if err != nil || !acquired {
		return err
	}
	success := false
	defer func() { finish(success) }()
	for index, tab := range config.Layout.Tabs {
		params := layoutApplyParams{TabLabel: tab.Label, Focus: index == 0, Root: buildRoot(tab, context.CWD)}
		if index == 0 {
			params.TabID = context.Workspace.ActiveTabID
		} else {
			params.WorkspaceID = workspaceID
		}
		payload, err := json.Marshal(params)
		if err != nil {
			return err
		}
		if _, err := client.call("layout.apply", payload); err != nil {
			return err
		}
	}
	success = true
	return nil
}

func run() error {
	config, err := loadConfig()
	if err != nil {
		return err
	}
	if len(os.Args) == 2 && os.Args[1] == "--picker-roots" {
		for _, root := range config.DirectoryPicker.Roots {
			expanded, err := expandHome(root)
			if err != nil {
				return err
			}
			fmt.Println(expanded)
		}
		return nil
	}
	socketPath := os.Getenv("HERDR_SOCKET_PATH")
	if socketPath == "" {
		return errors.New("HERDR_SOCKET_PATH is required")
	}
	state, err := newState(socketPath)
	if err != nil {
		return err
	}
	client := SocketClient{Path: socketPath}
	event := strings.ReplaceAll(os.Getenv("HERDR_PLUGIN_EVENT"), "_", ".")
	if event == "startup" {
		snapshot, err := client.snapshot()
		if err != nil {
			return err
		}
		ids := make([]string, 0, len(snapshot.Workspaces))
		for _, workspace := range snapshot.Workspaces {
			ids = append(ids, workspace.ID)
		}
		return state.recordKnown(ids)
	}
	if event != "workspace.created" && event != "workspace.focused" {
		return nil
	}
	if event == "workspace.focused" && !state.initialized() {
		return nil
	}
	workspaceID, err := eventWorkspaceID(os.Getenv("HERDR_PLUGIN_EVENT_JSON"))
	if err != nil {
		return err
	}
	if event == "workspace.focused" && state.hasKnown(workspaceID) {
		return nil
	}
	return applyWorkspace(client, state, config, workspaceID)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "global-space-layout:", err)
		os.Exit(1)
	}
}
