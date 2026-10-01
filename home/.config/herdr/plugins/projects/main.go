package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Version  int       `yaml:"version"`
	Projects []Project `yaml:"projects"`
}

type Project struct {
	Name      string `yaml:"name"`
	Directory string `yaml:"directory"`
}

func configPath() (string, error) {
	if path := os.Getenv("HERDR_PROJECTS_CONFIG"); path != "" {
		return expandHome(path)
	}
	if root := os.Getenv("HERDR_PLUGIN_ROOT"); root != "" {
		return filepath.Join(filepath.Dir(filepath.Dir(root)), "projects.yaml"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "herdr", "projects.yaml"), nil
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
	if err := validateConfig(config); err != nil {
		return config, err
	}
	return resolveProjects(config)
}

func validateConfig(config Config) error {
	if config.Version != 1 {
		return fmt.Errorf("version must be 1")
	}
	if len(config.Projects) == 0 {
		return fmt.Errorf("projects must contain at least one project")
	}

	names := make(map[string]bool, len(config.Projects))
	directories := make(map[string]bool, len(config.Projects))
	for index, project := range config.Projects {
		if strings.TrimSpace(project.Name) == "" || strings.ContainsAny(project.Name, "\t\r\n") {
			return fmt.Errorf("projects[%d].name must be non-empty and on one line", index)
		}
		if names[project.Name] {
			return fmt.Errorf("projects[%d].name %q is duplicated", index, project.Name)
		}
		names[project.Name] = true

		if strings.TrimSpace(project.Directory) == "" || strings.ContainsAny(project.Directory, "\t\r\n") {
			return fmt.Errorf("projects[%d].directory must be a non-empty path", index)
		}
		if directories[project.Directory] {
			return fmt.Errorf("projects[%d].directory %q is duplicated", index, project.Directory)
		}
		directories[project.Directory] = true
	}
	return nil
}

func resolveProjects(config Config) (Config, error) {
	for index := range config.Projects {
		directory, err := expandHome(config.Projects[index].Directory)
		if err != nil {
			return config, err
		}
		if !filepath.IsAbs(directory) {
			return config, fmt.Errorf("projects[%d].directory must be absolute or start with ~/", index)
		}
		info, err := os.Stat(directory)
		if err != nil {
			return config, fmt.Errorf("projects[%d].directory %s: %w", index, directory, err)
		}
		if !info.IsDir() {
			return config, fmt.Errorf("projects[%d].directory %s is not a directory", index, directory)
		}
		config.Projects[index].Directory = filepath.Clean(directory)
	}
	return config, nil
}

func selectProject(projects []Project) (Project, bool, error) {
	choices := make(map[string]Project, len(projects))
	var input bytes.Buffer
	for _, project := range projects {
		choice := project.Name + "\t" + project.Directory
		choices[choice] = project
		fmt.Fprintln(&input, choice)
	}

	command := exec.Command("fzf", "--delimiter=\t", "--with-nth=1,2", "--prompt=New project space> ", "--height=100%")
	command.Stdin = &input
	command.Stderr = os.Stderr
	var output bytes.Buffer
	command.Stdout = &output
	if err := command.Run(); err != nil {
		var exitError *exec.ExitError
		if errors.As(err, &exitError) && (exitError.ExitCode() == 1 || exitError.ExitCode() == 130) {
			return Project{}, false, nil
		}
		return Project{}, false, fmt.Errorf("run fzf: %w", err)
	}

	choice := strings.TrimSuffix(output.String(), "\n")
	project, found := choices[choice]
	if !found {
		return Project{}, false, fmt.Errorf("fzf returned an unknown project")
	}
	return project, true, nil
}

func createWorkspace(project Project) error {
	herdr := os.Getenv("HERDR_BIN_PATH")
	if herdr == "" {
		herdr = "herdr"
	}
	command := exec.Command(herdr, "workspace", "create", "--cwd", project.Directory, "--label", project.Name, "--focus")
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	if err := command.Run(); err != nil {
		return fmt.Errorf("create Herdr space: %w", err)
	}
	return nil
}

func run() error {
	config, err := loadConfig()
	if err != nil {
		return err
	}
	project, selected, err := selectProject(config.Projects)
	if err != nil || !selected {
		return err
	}
	return createWorkspace(project)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "projects:", err)
		os.Exit(1)
	}
}
