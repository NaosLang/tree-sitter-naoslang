; ============================================================
; Naos — Tree-sitter highlights
; ============================================================

; ============================================================
; COMMENTS
; ============================================================

(comment_line) @comment
(comment_multiline) @comment

; ============================================================
; LITERALS
; ============================================================

(string_literal) @string
(integer_literal) @number
(float_literal) @number.float
(char_literal) @character

; ============================================================
; KEYWORDS
; ============================================================

[
"let"
"const"
] @keyword

"fn" @keyword.function

"return" @keyword.return
"break" @keyword.return
"continue" @keyword.return

"if" @keyword.conditional

"loop" @keyword.repeat

"defer" @keyword

"using" @keyword.import
"@import" @keyword.import

"extends" @keyword

[
"type"
"struct"
"interface"
"dyn"
] @keyword.type

"pub" @keyword.modifier

; ============================================================
; BUILTIN / SPECIAL VALUES
; ============================================================

"self" @variable.builtin

; ============================================================
; ATTRIBUTES
; ============================================================

"@" @punctuation.special

(attribute
name: (identifier) @attribute)

(attribute_pair
key: (identifier) @property)

(attribute_pair
value: (string_literal) @string)

; ============================================================
; TYPES
; ============================================================

; Simple type:
;
;   int
;   string
;   Foo
;   MyType
;
(id_type
(identifier) @type)

; Generic type:
;
;   Vec<int>
;   Result<string>
;
(generic_id_type
name: (identifier) @type)

; Generic arguments are types themselves, so the nested
; id_type/generic_id_type rules handle them automatically.

; dyn Trait
;
(dynamic_id_type
base: (id_type
(identifier) @type))

; Pointer:
;
;   *int
;   *const Foo
;
(ptr_type
base: (_type) @type)

; Array pointer:
;
;   [*]Foo
;   [*]const Foo
;
(array_ptr_type
base: (_type) @type)

; Fixed-size array:
;
;   [10]int
;
(array_type
base: (_type) @type)

; Slice:
;
;   []int
;
(slice_type
base: (_type) @type)

; Function types:
;
;   fn(int, string) -> bool
;
(function_type
return_type: (_type) @type)

; ============================================================
; TYPE DECLARATIONS
; ============================================================

; type Foo = ...
(alias_type
name: (identifier) @type.definition)

; type Foo :: ...
(new_type
name: (identifier) @type.definition)

; Generic parameters:
;
;   type Foo<T> ...
;
(generic_params
types: (id_type
(identifier) @type.parameter)

; Struct fields:
;
;   struct {
;       pub foo: int,
;       bar: string,
;   }
;
(struct_pair
name: (identifier) @property)

; Interface associated types:
;
;   interface {
;       type Foo | Bar
;   }
;
(interface_type_body
types: (_type) @type)

; ============================================================
; FUNCTIONS
; ============================================================

; Function declaration:
;
;   fn foo(...) { ... }
;
(function_sign
name: (identifier) @function)

; Interface methods use function_sign too, so they automatically
; receive @function.

; Function calls:
;
;   foo(...)
;
(call_expression
function: (identifier) @function.call)

; Method calls:
;
;   foo.bar(...)
;
(call_expression
function: (member_expression
property: (identifier) @function.call))

; ============================================================
; FUNCTION PARAMETERS
; ============================================================

(parameter
(identifier) @variable.parameter)

; self parameter:
;
;   self: Foo
;
(self_parameter
"self" @variable.builtin)

; ============================================================
; VARIABLES
; ============================================================

; let foo
;
(variable_declaration
kind: "let"
name: (identifier) @variable)

; const foo
;
(variable_declaration
kind: "const"
name: (identifier) @constant)

; Generic fallback for declarations
;
(variable_declaration
name: (identifier) @variable)

; ============================================================
; IMPORTS
; ============================================================

; using @import("foo");
;
(global_import
"using" @keyword.import)

; alias = @import("foo");
;
(alias_import
(identifier) @variable)

(alias_import
path: (string_literal) @string)

; ============================================================
; MEMBER ACCESS
; ============================================================

; foo.bar
;
(member_expression
property: (identifier) @property)

; ============================================================
; OPERATORS
; ============================================================

[
"="
"+="
"-="
"*="
"/="
"%="
"&="
"|="
"^="
"<<="
">>="
"&^="
":="

"++"
"--"

"+"
"-"
"*"
"/"
"%"
"|"
"^"
"&"
"&^"

"<<"
">>"

"=="
"!="
"<"
">"
"<="
">="

"&&"
"||"

"!"
"~"

"->"
] @operator

; ============================================================
; PUNCTUATION
; ============================================================

[
"("
")"
"{"
"}"
"["
"]"
] @punctuation.bracket

"[*]" @punctuation.bracket
"[]" @punctuation.bracket

[
"."
","
":"
";"
"::"
] @punctuation.delimiter
