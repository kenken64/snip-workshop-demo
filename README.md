# Snip CLI

The zero-dependency Snip CLI talks to the Snip backend using Node's global
`fetch`. Set `SNIP_API` to use a different backend; it defaults to
`http://localhost:3000`.

```sh
node cli.js add https://example.com
node cli.js ls
node cli.js open abc123
```

The `snip`, `snip.cmd`, and `snip.ps1` wrappers run the same CLI on Unix,
Windows CMD, and PowerShell. To install the `snip` command through npm, run
`npm link` from this folder.
