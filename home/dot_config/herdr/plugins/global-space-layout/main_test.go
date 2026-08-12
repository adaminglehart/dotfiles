package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfigAndBuildRoot(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "layout.yaml")
	content := "version: 1\nlayout:\n  tabs:\n    - label: main\n      panes:\n        - label: shell\n        - label: logs\n          split: right\n          size: 30%\n          command: [tail, -f, /tmp/log]\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HERDR_GLOBAL_LAYOUT_CONFIG", path)
	config, err := loadConfig()
	if err != nil {
		t.Fatal(err)
	}
	root := buildRoot(config.Layout.Tabs[0], "/workspace")
	if root.Type != "split" || root.Direction != "right" || root.Ratio != 0.7 {
		t.Fatalf("unexpected root: %#v", root)
	}
	if root.First.CWD != "/workspace" || root.Second.Command[0] != "tail" {
		t.Fatalf("unexpected panes: %#v", root)
	}
}

func TestLoadConfigRejectsInvalidSplit(t *testing.T) {
	path := filepath.Join(t.TempDir(), "layout.yaml")
	content := "version: 1\nlayout:\n  tabs:\n    - label: main\n      panes:\n        - label: shell\n        - label: invalid\n          split: left\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HERDR_GLOBAL_LAYOUT_CONFIG", path)
	if _, err := loadConfig(); err == nil {
		t.Fatal("loadConfig accepted an invalid split")
	}
}
