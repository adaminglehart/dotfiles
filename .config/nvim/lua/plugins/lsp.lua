require 'lspconfig'.gleam.setup({})

return {
  default_config = {
    cmd = { 'gleam', 'lsp' },
    filetypes = { 'gleam' },
    root_dir = function(fname)
      return util.root_pattern('gleam.toml', '.git')(fname)
    end,
  }
}
