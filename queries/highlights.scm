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
"#" @punctuation.special

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

; Generic parameter declarations (con vincolo obbligatorio):
;
;   fn foo<T: Numeric>(...)
;   type Foo<T: Bar> :: ...
;
(generic_constr
name: (identifier) @type.parameter
type: (_) @type)

; dyn Trait
;
(dynamic_id_type
base: (id_type
(identifier) @type))

; Pointer, array pointer, fixed-size array, slice, function types:
;
;   *int  *const Foo  [*]Foo  [10]int  []int  fn(int) -> bool
;
; NOTA: `_type` è una regola nascosta (nome con underscore) nella
; grammatica: non esiste come tipo di nodo concreto, quindi non è
; interrogabile direttamente. I nodi concreti che la sostituiscono
; (id_type, generic_id_type, dynamic_id_type, ptr_type, ecc.) sono
; già coperti dalle regole sopra/sotto in modo ricorsivo, quindi qui
; usiamo il wildcard (_) solo per essere sicuri di colorare anche
; combinazioni non esplicitamente elencate altrove.
(ptr_type base: (_) @type)
(array_ptr_type base: (_) @type)
(array_type base: (_) @type)
(slice_type base: (_) @type)
(function_type return_type: (_) @type)

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
types: (_) @type)

; ============================================================
; STRUCT / CAST / COMPILER BUILTINS
; ============================================================

; Struct literal:
;
;   Foo{ x: 1, y: 2 }
;   Option#<int>{ value: 1 }
;
(struct_literal
name: (identifier) @type)

(struct_members_expr
name: (identifier) @property)

; @as(Type, value) / @bitcast(Type, value)
;
(cast_action
name: (identifier) @function.builtin)

(cast_action
type: (_) @type)

; Generic compiler builtins: @sizeof(T), @malloc(n), ecc.
;
(compiler_action
name: (identifier) @function.builtin)

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
