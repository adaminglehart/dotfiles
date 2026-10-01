package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	projectDirectory := t.TempDir()
	path := filepath.Join(t.TempDir(), "projects.yaml")
	content := "version: 1\nprojects:\n  - name: test project\n    directory: " + projectDirectory + "\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HERDR_PROJECTS_CONFIG", path)

	config, err := loadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if len(config.Projects) != 1 || config.Projects[0].Name != "test project" || config.Projects[0].Directory != projectDirectory {
		t.Fatalf("unexpected config: %#v", config)
	}
}

func TestLoadConfigRejectsDuplicateProjectNames(t *testing.T) {
	projectDirectory := t.TempDir()
	path := filepath.Join(t.TempDir(), "projects.yaml")
	content := "version: 1\nprojects:\n  - name: duplicate\n    directory: " + projectDirectory + "\n  - name: duplicate\n    directory: /tmp\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HERDR_PROJECTS_CONFIG", path)

	if _, err := loadConfig(); err == nil {
		t.Fatal("loadConfig accepted duplicate project names")
	}
}

func TestLoadConfigRejectsMissingDirectory(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.yaml")
	content := "version: 1\nprojects:\n  - name: missing\n    directory: /path/that/does/not/exist\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HERDR_PROJECTS_CONFIG", path)

	if _, err := loadConfig(); err == nil {
		t.Fatal("loadConfig accepted a missing project directory")
	}
}
