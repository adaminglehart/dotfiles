function pi-personal --description 'Start pi with personal profile'
    env PI_CODING_AGENT_DIR=/Users/adaminglehart/.pi-personal/agent pi --mcp-config /Users/adaminglehart/.pi-personal/agent/mcp.json $argv
end
