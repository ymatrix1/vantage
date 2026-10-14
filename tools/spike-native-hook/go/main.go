// Spike for vantage-xex6: native spool hook, mirrors packages/hooks/src/collect.ts.
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"time"
)

func main() {
	defer os.Exit(0)
	in, err := io.ReadAll(os.Stdin)
	if err != nil {
		return
	}
	var probe map[string]json.RawMessage
	if json.Unmarshal(in, &probe) != nil || probe == nil {
		return
	}
	var hook bytes.Buffer
	if json.Compact(&hook, in) != nil {
		return
	}
	home := os.Getenv("VANTAGE_HOME")
	if home == "" {
		h, err := os.UserHomeDir()
		if err != nil {
			return
		}
		home = filepath.Join(h, ".vantage")
	}
	dir := filepath.Join(home, "spool")
	if os.MkdirAll(dir, 0o755) != nil {
		return
	}
	now := time.Now().UTC()
	line := `{"v":1,"receivedAt":"` + now.Format("2006-01-02T15:04:05.000Z") + `","hook":` + hook.String() + "}\n"
	f, err := os.OpenFile(filepath.Join(dir, now.Format("2006-01-02")+".jsonl"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	f.WriteString(line)
	f.Close()
}
