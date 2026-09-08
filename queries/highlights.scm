(identifier) @variable

(comment_line) @comment
(comment_multiline) @comment

(string_literal) @string
(integer_literal) @number
(float_literal) @number.float
(char_literal) @character

["let" "const"] @keyword
"fn" @keyword.function
"return" @keyword.return
"if" @keyword.conditional
"loop" @keyword.repeat
"break" @keyword.return
"continue" @keyword.return
"defer" @keyword
"using" @keyword.import
"@import" @keyword.import
"extends" @keyword
"type" @keyword.type
"struct" @keyword.type
"interface" @keyword.type
"dyn" @keyword.type
"pub" @keyword.modifier
"self" @variable.builtin

"@" @attribute
(attribute name: (identifier) @attribute)
(attribute_args) @attribute
(attribute_pair key: (identifier) @property)

(id_type (identifier) @type)
(generic_id_type name: (identifier) @type)
(dynamic_id_type base: (id_type) @type)
(new_type name: (identifier) @type.definition)
(alias_type name: (identifier) @type.definition)

(function_sign name: (identifier) @function)
(call_expression function: (identifier) @function.call)
(call_expression
  function: (member_expression property: (identifier) @function.call))

(parameter (identifier) @variable.parameter)

(struct_pair name: (identifier) @property)
(member_expression property: (identifier) @property)

(variable_declaration name: (identifier) @variable)
(variable_declaration kind: "const" name: (identifier) @constant)

(alias_import (identifier) @variable)

[
  "=" "+=" "-=" "*=" "/=" "%=" "&=" "|=" "^=" "<<=" ">>=" "&^="
  "++" "--"
  "+" "-" "*" "/" "%" "|" "^" "&^" "&"
  "<<" ">>" "==" "!=" "<" ">" "<=" ">="
  "&&" "||" "!" "~"
  ":="
] @operator

"->" @operator

["(" ")"] @punctuation.bracket
["{" "}"] @punctuation.bracket
["[" "]"] @punctuation.bracket
"[*]" @punctuation.bracket
"[]" @punctuation.bracket

["." "," ":" ";" "::"] @punctuation.delimiter
