#!/usr/bin/env python3
"""Direct MCP client for the local Paper Desktop server (streamable-HTTP).

Fallback for harnesses whose MCP bridge stringifies object arguments: the
`export` tool then fails validation with `expected "nodes-with-exports-only"`
even when the arguments are correct. This client sends real JSON.

Stdlib only. Usage:

  paper_mcp.py list
  paper_mcp.py info <fileId> [pageId]           # pages + artboards
  paper_mcp.py call <tool> '<json-args>'
  paper_mcp.py export <fileId> <nodeId> <pageId> <dest.png> [--scale 2x]

`export` writes to <dest> (Paper itself always drops the file into ~/Downloads).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

TIMEOUT_S = 600

# (config path, json path to the server URL) — first hit wins.
CONFIG_LOOKUPS = (
    ("~/.cursor/mcp.json", ("mcpServers", "paper", "url")),
    ("~/.claude.json", ("mcpServers", "paper", "url")),
    (".mcp.json", ("mcpServers", "paper", "url")),
)
DEFAULT_URL = "http://127.0.0.1:29979/mcp"


def server_url() -> str:
    env = os.environ.get("PAPER_MCP_URL")
    if env:
        return env
    for path, keys in CONFIG_LOOKUPS:
        try:
            with open(os.path.expanduser(path), encoding="utf-8") as f:
                node = json.load(f)
            for k in keys:
                node = node[k]
            if isinstance(node, str) and node.startswith(("http://", "https://")):
                return node
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return DEFAULT_URL


class PaperMcp:
    def __init__(self, url: str | None = None):
        self.url = url or server_url()
        self.session_id: str | None = None

    def _post(self, payload: dict) -> dict | None:
        data = json.dumps(payload).encode()
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        req = urllib.request.Request(self.url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                sid = resp.headers.get("mcp-session-id")
                body = resp.read().decode()
        except urllib.error.URLError as exc:
            raise SystemExit(f"Paper MCP unreachable at {self.url}: {exc.reason}")
        if sid:
            self.session_id = sid
        if not body.strip():
            return None
        if body.lstrip().startswith(("event:", "data:")):
            msgs = [ln[5:].strip() for ln in body.splitlines() if ln.startswith("data:")]
            return json.loads(msgs[-1]) if msgs else None
        return json.loads(body)

    def init(self) -> None:
        self._post({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "paper-mcp-cli", "version": "0.2"},
            },
        })
        try:
            self._post({"jsonrpc": "2.0", "method": "notifications/initialized"})
        except urllib.error.HTTPError:
            pass  # 202 with empty body on some servers

    def call(self, tool: str, arguments: dict) -> dict:
        if not self.session_id:
            self.init()
        resp = self._post({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": tool, "arguments": arguments},
        })
        if resp is None:
            raise SystemExit(f"{tool}: empty response from Paper MCP")
        if "error" in resp:
            raise SystemExit(f"{tool}: MCP error {resp['error'].get('code')}: "
                             f"{resp['error'].get('message')}")
        result = resp["result"]
        if result.get("isError"):
            # Paper reports tool failures inside the result, not as a JSON-RPC error.
            raise SystemExit(f"{tool}: {error_text(result)}")
        return result

    def tools(self) -> list[dict]:
        if not self.session_id:
            self.init()
        resp = self._post({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        return (resp or {}).get("result", {}).get("tools", [])


def text_blocks(result: dict) -> list[str]:
    return [c["text"] for c in result.get("content", []) if c.get("type") == "text"]


def error_text(result: dict) -> str:
    """Human-readable part of an isError result: skip the JSON file-header block."""
    parts = []
    for text in text_blocks(result):
        try:
            json.loads(text)
            continue
        except ValueError:
            parts.append(text.strip())
    return " ".join(parts) or "isError"


def json_block(result: dict, key: str) -> dict:
    """Paper answers with several text blocks; return the one holding `key`."""
    for text in text_blocks(result):
        try:
            obj = json.loads(text)
        except ValueError:
            continue
        if isinstance(obj, dict) and key in obj:
            return obj
    raise SystemExit(f"no text block with '{key}' in Paper response")


def cmd_list(_: argparse.Namespace) -> None:
    for t in PaperMcp().tools():
        print(t["name"])


def cmd_info(ns: argparse.Namespace) -> None:
    args = {"fileId": ns.file_id}
    if ns.page_id:
        args["pageId"] = ns.page_id
    info = json_block(PaperMcp().call("get_basic_info", args), "artboards")
    if ns.page_id:
        print(f"page: {info.get('pageName')} ({ns.page_id})")
    else:
        print("pages:")
        for p in info.get("pages", []):
            print(f"  {p['id']}  {p['name']}{'  (active)' if p.get('isActive') else ''}")
    print("artboards:")
    for a in info.get("artboards", []):
        h = a.get("height")
        print(f"  {a['id']}  {a['name']}  {a['width']}x{h if h is not None else 'fit-content'}")


def cmd_call(ns: argparse.Namespace) -> None:
    result = PaperMcp().call(ns.tool, json.loads(ns.args) if ns.args else {})
    # keep base64 images out of stdout
    for c in result.get("content", []):
        if c.get("type") == "image" and len(c.get("data", "")) > 400:
            c["data"] = c["data"][:400] + f"...<{len(c['data'])} chars>"
    print(json.dumps(result, ensure_ascii=False, indent=1))


def cmd_export(ns: argparse.Namespace) -> None:
    result = PaperMcp().call("export", {
        "nodes": {ns.node_id: [{"format": "png", "scale": ns.scale}]},
        "fileId": ns.file_id,
        "pageId": ns.page_id,
        "type": "image",
    })
    exports = json_block(result, "exports")["exports"]
    src = next((e["filePath"] for e in exports if e.get("nodeId") == ns.node_id), None)
    if not src or not os.path.isfile(src):
        raise SystemExit(f"export did not produce a file for {ns.node_id}: {exports}")
    os.makedirs(os.path.dirname(os.path.abspath(ns.dest)), exist_ok=True)
    os.replace(src, ns.dest)
    print(f"{ns.dest}  ({os.path.getsize(ns.dest)} bytes, {ns.scale})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="list tool names").set_defaults(fn=cmd_list)

    p = sub.add_parser("info", help="pages and artboards of a file")
    p.add_argument("file_id")
    p.add_argument("page_id", nargs="?")
    p.set_defaults(fn=cmd_info)

    p = sub.add_parser("call", help="raw tools/call")
    p.add_argument("tool")
    p.add_argument("args", nargs="?", default="{}")
    p.set_defaults(fn=cmd_call)

    p = sub.add_parser("export", help="export one node as PNG and move it to <dest>")
    p.add_argument("file_id")
    p.add_argument("node_id")
    p.add_argument("page_id")
    p.add_argument("dest")
    p.add_argument("--scale", default="2x")
    p.set_defaults(fn=cmd_export)

    ns = ap.parse_args()
    ns.fn(ns)


if __name__ == "__main__":
    main()
