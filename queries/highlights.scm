; highlights.scm — naoslang
; Tree-sitter highlight query file

; ---------------------------------------------------------------------------
; Comments
; ---------------------------------------------------------------------------

(comment_line) @comment
(comment_multiline) @comment

; ---------------------------------------------------------------------------
; Keywords
; ---------------------------------------------------------------------------

[
  "extends"
  "type"
  "fn"
  "struct"
  "interface"
] @keyword

; "using @import(...)" and "id = @import(...)" — keep "using", "@" and
; "import" all under the same capture so they can share one color
"using" @keyword.import
"import" @keyword.import
(global_import "@" @keyword.import)
(alias_import "@" @keyword.import)

(pub_keyword) @keyword.modifier
(const_keyword) @keyword.modifier
(let_keyword) @keyword

(compiler_cast_action_keywords) @keyword.operator

; ---------------------------------------------------------------------------
; Punctuation
; ---------------------------------------------------------------------------

["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" ":" "." "#"] @punctuation.delimiter
"@" @punctuation.special

; ---------------------------------------------------------------------------
; Operators
; ---------------------------------------------------------------------------

; binary operators are grouped by tree-sitter under these named
; wrapper rules — capture the wrapper node itself rather than the
; raw string, since compound tokens like "&&"/"||"/"<<" are not
; always exposed as standalone anonymous node types
[
  (prec1_operators)
  (prec2_operators)
  (prec3_operators)
  (prec4_operators)
  (prec5_operators)
  (prec6_operators)
] @operator

; tokens used directly (not behind a wrapper rule) are safe as raw strings
["=" "->" "::"] @operator
["-" "!" "~" "&" "*"] @operator

; ---------------------------------------------------------------------------
; Literals
; ---------------------------------------------------------------------------

(str_literal) @string
(raw_str_literal) @string
(char_literal) @character
(int_literal) @number
(float_literal) @number.float

; generic fallback for a "bare" identifier
(id_literal) @variable

; ---------------------------------------------------------------------------
; Functions
; ---------------------------------------------------------------------------

(func_sign name: (id_literal) @function)
(func_literal_param name: (id_literal) @variable.parameter)
(func_literal_param type: (id_type) @type)
(id_type_pair name: (id_literal) @variable.parameter)

; calls: plain name or member access (obj.method())
(call_expression name: (id_literal) @function.call)
(call_expression
  name: (member_expression member: (id_literal) @function.call))

; "plain" member access (not followed by a call)
(member_expression member: (id_literal) @property)

; ---------------------------------------------------------------------------
; Types
; ---------------------------------------------------------------------------

(id_type) @type
(module_type module: (id_literal) @module)
(module_type type: (id_type) @type)
(generic_type name: (id_type) @type)

(new_type name: (id_literal) @type.definition)
(alias_type name: (id_literal) @type.definition)
(type_extension name: (id_literal) @type)

; ---------------------------------------------------------------------------
; Variables
; ---------------------------------------------------------------------------

(global_variable_def name: (id_literal) @variable)
(local_variable_def name: (id_literal) @variable)

; ---------------------------------------------------------------------------
; Struct literals / constructors
; ---------------------------------------------------------------------------

(struct_literal name: (id_literal) @constructor)
(struct_literal_member name: (id_literal) @property)

; ---------------------------------------------------------------------------
; Compiler attributes/actions (@name(...))
; ---------------------------------------------------------------------------

(compiler_attribute name: (id_literal) @attribute)
(compiler_attribute_pair key: (id_literal) @property)
(compiler_cast_action name: (compiler_cast_action_keywords) @keyword.operator)

; compiler_action: "@name" treated as a single special token
; (overrides both "@" @punctuation.special and the @variable fallback
; on the name, since it's declared later in the file)
(compiler_action "@" @function.macro)
(compiler_action name: (id_literal) @function.macro)
