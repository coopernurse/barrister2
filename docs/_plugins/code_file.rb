module Jekyll
  class CodeFile < Liquid::Tag
    def initialize(tag_name, markup, tokens)
      super
      @path = markup.strip
    end

    def render(context)
      site = context.registers[:site]
      
      # site.source points to /Users/james/src/pulserpc/docs
      # workspace_root is /Users/james/src/pulserpc
      # The path ../../examples/checkout.idl is a relative path from workspace root
      # - ../../ means go up from /Users/james/src to /Users/james
      # - BUT we want it relative to docs, so ../examples is the correct interpretation
      
      # Since the docs folder is one level down from workspace root,
      # ../../examples should be interpreted as ../examples from docs folder
      
      workspace_root = File.dirname(site.source)
      
      # Normalize paths starting with ../../ to be ../ for one level up from docs
      path_to_use = @path.sub(/^\.\.\/\.\.\//, '../')
      
      # Join relative to docs folder and expand to absolute
      file_path = File.expand_path(path_to_use, site.source)

      if File.exist?(file_path)
        contents = File.read(file_path)
        # Detect syntax from file extension
        ext = File.extname(file_path).sub(/^\./, '')
        # Map extensions to syntax names
        syntax_map = {
          'py' => 'python',
          'go' => 'go',
          'java' => 'java',
          'ts' => 'typescript',
          'tsx' => 'typescript',
          'js' => 'javascript',
          'rb' => 'ruby',
          'cs' => 'csharp',
          'cpp' => 'cpp',
          'c' => 'c',
          'h' => 'c',
          'sh' => 'bash',
          'yml' => 'yaml',
          'yaml' => 'yaml',
          'json' => 'json',
          'md' => 'markdown',
          'html' => 'html',
          'css' => 'css',
          'sql' => 'sql',
          'idl' => 'text'  # IDL doesn't have a standard highlighter
        }
        syntax = syntax_map[ext] || ext
        "```#{syntax}\n#{contents}\n```"
      else
        # Return helpful error message
        error_msg = "**Error: File not found: `#{@path}`**"
        if @path.start_with?('docs/examples/')
          # Suggest checking the examples directory
          error_msg += "\n\n*Note: Code examples will be created in the `docs/examples/` directory.*"
        end
        error_msg
      end
    end
  end
end

Liquid::Template.register_tag('code_file', Jekyll::CodeFile)
