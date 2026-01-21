---
title: Web UI
nav_order: 1
layout: default
has_children: true
---

# Barrister2 Web UI

The Barrister2 Web UI provides a browser-based interface for working with JSON-RPC services. It offers two modes:

- **[Universal Client](universal-client.html)** - Connect to and test existing JSON-RPC services
- **[Playground](playground.html)** - Write IDL and generate code in your browser

![Web UI Homepage]({{ site.baseurl }}/assets/images/webui/homepage.png)

## Starting the Web UI

To start the Web UI, run:

```bash
./target/barrister -ui -ui-port 8080
```

Then open your browser to `http://localhost:8080`.

## Choosing a Mode

When you first open the Web UI, you'll see two options:

- **[Client](universal-client.html)** - Use this mode to connect to a running JSON-RPC service and interactively call methods
- **[Playground](playground.html)** - Use this mode to write IDL definitions and generate server/client code

Both modes are fully functional in the browser and require no additional installation beyond the Barrister binary.
