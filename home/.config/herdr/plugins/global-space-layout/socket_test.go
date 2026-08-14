package main

import (
	"bufio"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSocketClientSnapshot(t *testing.T) {
	path := filepath.Join(t.TempDir(), "herdr.sock")
	listener, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() {
		connection, acceptErr := listener.Accept()
		if acceptErr != nil {
			return
		}
		defer connection.Close()
		line, _ := bufio.NewReader(connection).ReadString('\n')
		if !strings.Contains(line, `"method":"session.snapshot"`) {
			return
		}
		_, _ = connection.Write([]byte(`{"id":"test","result":{"type":"session_snapshot","snapshot":{"workspaces":[{"workspace_id":"w1","active_tab_id":"w1:t1","tab_count":1,"pane_count":1}]}}}` + "\n"))
	}()
	snapshot, err := (SocketClient{Path: path}).snapshot()
	if err != nil {
		t.Fatal(err)
	}
	if len(snapshot.Workspaces) != 1 || snapshot.Workspaces[0].ID != "w1" {
		t.Fatalf("unexpected snapshot: %#v", snapshot)
	}
	_ = os.Remove(path)
}
