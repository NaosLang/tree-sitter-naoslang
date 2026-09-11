const typeExcept = ($, ...excluded) => {
    const types = [
        $.id_type,
        $.ptr_type,
        $.arr_ptr_type,
        $.arr_type,
        $.slice_type,
        $.func_type,
        $.module_type,
        $.generic_type,
    ];
    return choice(...types.filter(t => !excluded.includes(t)))
};

const literalExcept = ($, ...excluded) => {
    const literals = [
        $.id_literal,
        $.str_literal,
        $.raw_str_literal,
        $.char_literal,
        $.int_literal,
        $.float_literal,
        $.func_literal,
        $.arr_literal,
        $.slice_literal,
        $.struct_literal,
    ];
    return choice(...literals.filter(t => !excluded.includes(t)))
};


module.exports = grammar({
    name: 'naoslang',

    rules: {
        source_file: $ => seq(
            // imports are valid only on top of the file
            repeat($._imports),

            repeat($._type),
        ),

        // +------+
        // | Misc |
        // +------+

        not_implemented_syntax: $ => token('\0'),


        // +---------+
        // | Helpers |
        // +---------+

        // func_param parses a function parameter -> [const] id: PTYPE
        func_param_literal: $ => seq(
            optional(field('const', prec(1, 'const'))),
            field('name', $.id_literal),
            ':',
            field('type', $._primitive_type),
        ),

        // func_param_type parses a function parameter type -> [const] PTYPE
        func_param_type: $ => seq(
            optional(field('const', prec(1, 'const'))),
            field('type', $._primitive_type),
        ),

        // func_return parses the function return type -> -> PTYPE
        _func_return: $ => seq(
            '->',
            field('type', $._primitive_type),
        ),

        func_params_type: $ => _params_wrapper('(', $.func_param_type, ')'),
        func_params_literal: $ => _params_wrapper('(', $.func_param_literal, ')'),
        generic_params_type: $ => _params_wrapper('<', $.id_type, '>'),


        // struct_member parses a struct literal member -> id: [EXPR]
        struct_member: $ => seq(
            field('name', $.id_literal),
            ':',
            field('value', $.not_implemented_syntax), // expression
        ),

        // +---------+
        // | Imports |
        // +---------+

        // _imports dispaches to any import decl
        _imports: $ => choice(
            $.global_import,
            $.alias_import,
        ),

        // global_import parses the global import decl -> using @import(PATH);
        global_import: $ => seq(
            'using',
            $._generic_import,
            ';'
        ),

        // alias_import parses the alias import decl -> id = @import(PATH);
        alias_import: $ => seq(
            field('alias', $.id_literal),
            '=',
            $._generic_import,
            ';',
        ),

        // _generic_import parses the generic import decl -> @import(PATH)
        _generic_import: $ => seq(
            '@',
            'import',
            '(',
            field('path', choice($.str_literal, $.raw_str_literal)),
            ')',
        ),


        // +-------+
        // | Types |
        // +-------+

        // _type dispaches t any type
        _type: $ => typeExcept($),

        // _primitive_type dispaches only simple type (all types but struct and interfaces)
        _primitive_type: $ => typeExcept($),

        // its the same as the id_literal but is used in type only context
        id_type: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),

        // ptr_type parses pointers -> *PTYPE
        ptr_type: $ => seq(
            '*',
            field('base', $._primitive_type),
        ),

        // arr_ptr_type parses array pointers -> [*]PTYPE
        arr_ptr_type: $ => seq(
            '[*]',
            field('base', $._primitive_type),
        ),

        // arr_type parses arrays -> [N]PTYPE
        arr_type: $ => seq(
            '[',
            field('size', $.int_literal),
            ']',
            field('base', $._primitive_type),
        ),

        // slice_type parses slices -> []PTYPE
        slice_type: $ => seq(
            '[]',
            field('base', $._primitive_type),
        ),

        // func_type parses function -> fn(PARAMS) [-> PTYPE]
        func_type: $ => seq(
            'fn',
            field('parameters', $.func_params_type),
            optional($._func_return),
        ),

        module_type: $ => seq(
            field('module', $.id_literal),
            '.',
            field('name', $.id_type),
        ),

        generic_type: $ => seq(
            $.id_type,
            field('parameters', $.generic_params_type),
        ),

        // +----------+
        // | Literals |
        // +----------+

        // _literal dispaches to any literal parse token
        _literal: $ => literalExcept($),
        _sliceable_literal: $ => choice(
            $.str_literal,
            $.raw_str_literal,
            $.arr_literal,
            $.slice_literal,
        ),
        _nestable_literal: $ => choice(
            $.id_literal,
            $.struct_literal,
        ),


        // id_literal parses every identifier (variable names or type names)
        id_literal: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),

        // str_literal parses every type of "..." strings:
        //  - normal -> "hello"
        //  - empty  -> ""
        //  - base escp  -> "\n", "\they"
        //  - oct escp   -> "\000", "Hello \012"
        //  - hex escp   -> "\x3F", "\xaa"
        //  - utf16 escp -> "\u32aF"
        //  - utf32 escp -> "\Ua34254DF"
        str_literal: $ => token(seq(
            '"',
            repeat(choice(
                /[^"\\]+/,
                /\\[abfnrtv\\"]/,       // normal escapes
                /\\[0-7]{3}/,           // octal escape
                /\\x[0-9a-fA-F]{2}/,    // hexadecimal escape
                /\\u[0-9a-fA-F]{4}/,    // unicode16 escape
                /\\U[0-9a-fA-F]{8}/,    // unicode32 escape
            )),
            '"',
        )),

        // raw_str_literal parses raw strings -> `...`
        raw_str_literal: $ => token(seq(
            '`',
            repeat(/[^`]/),
            '`',
        )),

        // char_literal parses every type of chars:
        //  - normal     -> 'c'
        //  - base escp  -> '\n'
        //  - oct escp   -> '\000'
        //  - hex escp   -> '\x3F', '\xaa'
        //  - utf16 escp -> '\u32aF'
        //  - utf32 escp -> '\Ua34254DF'
        char_literal: $ => token(seq(
            '\'',
            choice(
                /[^'\\]+/,
                /\\[abfnrtv\\']/,
                /\\[0-7]{3}/,
                /\\x[0-9a-fA-F]{2}/,
                /\\u[0-9a-fA-F]{4}/,
                /\\U[0-9a-fA-F]{8}/,
            ),
            '\'',
        )),

        // int_literal parses every type of numbers:
        //  - hex     -> 0xfA3, 0XFaac21
        //  - decimal -> 10
        //  - octal   -> 0o136, 0O137
        //  - bin     -> 0b101, 0B1010
        //  - zero    -> 0
        int_literal: $ => token(choice(
            seq('0', choice('x', 'X'), _digits(/[0-9a-fA-F]/)), // hexadecimal integer
            seq(/[1-9]/, repeat(_digits(/[0-9]/))),                     // decimal integer
            seq('0', choice('o', 'O'), _digits(/[0-7]/)),       // octal integer
            seq('0', choice('b', 'B'), _digits(/[0-1]/)),       // binary integer
            '0', // zero becouse is not a valid int literal '013' in octal or decimal base
        )),

        // float_literal parses every type of floats:
        //  - normal    -> 3.14
        //  - no prefix -> .25
        //  - no infix  -> 4.
        //  - exp       -> 1e5, 1.34E-5, .25e+2
        float_literal: $ => token(seq(
            seq(
                _digits(/[0-9]/),
                '.',
                optional(_digits(/[0-9]/)),
                optional(_decimal_exp()),
            ),   // normal float -> 3.14 | 1. | 1.3e5

            seq(
                '.',
                _digits(/[0-9]/),
                optional(_decimal_exp())
            ),  // no start float -> .13 | .3e5
            seq(
                _digits(/[0-9]/),
                _decimal_exp()
            ),  // exp float -> 1e5

        )),

        // func_literal parses lambda functions -> fn(PARAMS) [-> PTYPE] BLOCK
        func_literal: $ => seq(
            'fn',
            field('parameters', $.func_params_literal),
            optional($._func_return),
            field('block', $.not_implemented_syntax), // block
        ),

        // arr_literal parses arrrays -> [EXPR, ...]
        arr_literal: $ => seq(
            '[',
            repeat($.not_implemented_syntax), // expression
            ']',
        ),

        // slice_literal parses a creation of a slice -> SLICEABLE[EXPR:EXPR]
        slice_literal: $ => seq(
            field('sliceable', $._sliceable_literal),
            '[',
            optional(field('start', $.not_implemented_syntax)), // expression
            ':',
            optional(field('end', $.not_implemented_syntax)), // expression
            ']',
        ),

        struct_literal: $ => seq(
            field('name', $.id_literal),
            '{',
            optional(separatedByTrailing(',', $.struct_member)),
            '}',
        ),
    }
});

// helper function for int_literal
function _digits(digit_regx) {
    return seq(digit_regx, repeat(seq(optional('_'), digit_regx)))
}

// helper function for float_literal
function _decimal_exp() {
    return seq(
        choice('e', 'E'),
        optional(choice('+', '-')),
        _digits(/[1-9]/)
    )
}

function _params_wrapper(w1, parmaRule, w2) {
    return seq(
        w1,
        optional(separatedBy(',', parmaRule)),
        w2,
    )
}

function separatedBy(sep, rule) {
    return seq(rule, repeat(seq(sep, rule)))
}

function separatedByTrailing(sep, rule) {
    return seq(rule, repeat(seq(sep, rule)), optional(sep))
}


// module.exports = grammar({
//     name: 'naoslang',
//
//     externals: $ => [
//         $.comment_multiline,
//     ],
//
//     extras: $ => [
//         /\s/,
//         $.comment_line,
//         $.comment_multiline,
//     ],
//     conflicts: $ => [
//         [$.struct_literal, $._primary_expression],
//     ],
//
//     rules: {
//         source_file: $ => seq(
//             repeat($._imports),
//             repeat($._program),
//         ),
//
//         _program: $ => choice(
//             $.glob_variable_declaration,
//             $.function_definition,
//             $.type_extension,
//             $._new_types
//         ),
//
//         // +----------+
//         // | Comments |
//         // +----------+
//
//         comment_line: $ => token(seq('//', /.*/)),
//
//
//         // +----------------+
//         // | Type Extension |
//         // +----------------+
//
//         type_extension: $ => seq(
//             'extends',
//             field('type', $._type),
//             '{',
//             repeat($.function_definition),
//             '}',
//         ),
//
//
//         // +-----------+
//         // | New Types |
//         // +-----------+
//
//         _new_types: $ => choice(
//             $.new_type,
//             $.alias_type,
//         ),
//
//         alias_type: $ => seq(
//             field('attributes', optional(repeat($.attribute))),
//             field('visibility', optional('pub')),
//             'type',
//             field('name', $.identifier),
//             '=',
//             field('base', $._type),
//             ';'
//         ),
//
//         new_type: $ => seq(
//             field('attributes', optional(repeat($.attribute))),
//             field('visibility', optional('pub')),
//             'type',
//             field('name', $.identifier),
//             field('generic_constr', optional($.generic_constr)),
//             '::',
//             $.complex_type,
//             ';'
//         ),
//
//         // +-----------+
//         // | Variables |
//         // +-----------+
//
//         glob_variable_declaration: $ => seq(
//             field('attributes', optional(repeat($.attribute))),
//             field('visibility', optional('pub')),
//             $.variable_declaration,
//         ),
//
//         variable_declaration: $ => seq(
//             field('kind', choice('let', 'const')),
//             field('name', $.identifier),
//             choice(
//                 seq(':', field('type', $._type), '='),
//                 ':=',
//             ),
//
//             field('value', $._expression),
//             ';'
//         ),
//
//         // +-----------+
//         // | Functions |
//         // +-----------+
//
//         function_definition: $ => seq(
//             field('attributes', optional(repeat($.attribute))),
//             field('visibility', optional('pub')),
//             $.function_sign,
//             field('body', $.block)
//         ),
//
//         function_sign: $ => seq(
//             'fn',
//             field('name', $.identifier),
//             field('generic_constr', optional($.generic_constr)),
//             $.function_params,
//             optional(seq(
//                 '->',
//                 field('type', $._type)
//             )),
//         ),
//
//         generic_constr: $ => seq(
//             '<',
//             commaSep1(seq(
//                 field('name', $.identifier),
//                 ':',
//                 field('type', $._type),
//             )),
//             '>',
//         ),
//
//         function_params: $ => seq(
//             '(',
//             optional($.function_params_content),
//             ')',
//         ),
//
//         function_params_content: $ => choice(
//             seq(
//                 field('self', $.self_parameter),
//                 optional(seq(',', commaSep1($.parameter))),
//             ),
//             commaSep1($.parameter),
//         ),
//
//         self_parameter: $ => seq(
//             field('name', 'self'),
//             ':',
//             field('type', $._type),
//         ),
//
//         parameter: $ => seq(
//             field('name', $.identifier),
//             ':',
//             field('type', $._type),
//         ),
//
//         block: $ => seq(
//             '{',
//             repeat($._statement),
//             '}'
//         ),
//
//         _statement: $ => choice(
//             $.variable_declaration,
//             $.return_statement,
//             $.assignment_statement,
//             $.update_statement,
//             $.break_statement,
//             $.defer_statement,
//             $.continue_statement,
//             $.loop_statement,
//             $.if_statement,
//             seq($._expression, ';'),
//         ),
//
//         return_statement: $ => seq(
//             'return',
//             optional($._expression),
//             ';'
//         ),
//
//         break_statement: $ => seq('break', ';'),
//         continue_statement: $ => seq('continue', ';'),
//
//         defer_statement: $ => seq(
//             'defer',
//             $._expression,
//             ';',
//         ),
//
//         loop_statement: $ => seq(
//             'loop',
//             $.block,
//         ),
//
//         if_statement: $ => seq(
//             'if',
//             '(',
//             field('condition', $._expression),
//             ')',
//             $.block,
//         ),
//
//         assignment_statement: $ => seq(
//             field('left', $._expression),
//             field('operator', choice(
//                 '=',
//                 '+=', '-=', '*=', '/=', '%=',
//                 '&=', '|=', '^=', '<<=', '>>=', '&^='
//             )),
//             field('right', $._expression),
//             ';'
//         ),
//
//         update_statement: $ => seq(
//             field('argument', $._expression),
//             field('operator', choice('++', '--')),
//             ';'
//         ),
//
//         // +-------------+
//         // | Expressions |
//         // +-------------+
//
//         _expression: $ => choice(
//             $.binary_expression,
//             $.unary_expression,
//             $.call_expression,
//             $.member_expression,
//             $.index_expression,
//             $.compiler_action,
//             $.cast_action,
//             $._primary_expression,
//         ),
//
//         struct_literal: $ => seq(
//             field('name', $.identifier),
//             field('genric_args', optional(seq('#', $.generic_params))),
//             '{',
//             field('members', commaSep1Trailing($.struct_members_expr)),
//             '}',
//         ),
//
//         struct_members_expr: $ => seq(
//             field('name', $.identifier),
//             ':',
//             field('value', $._expression),
//         ),
//
//         cast_action: $ => seq(
//             '@',
//             field('name', alias(choice('as', 'bitcast'), $.identifier)),
//             '(',
//             field('type', $._type),
//             ',',
//             field('value', $._expression),
//             ')',
//         ),
//
//         compiler_action: $ => seq(
//             '@',
//             field('name', $.identifier),
//             '(',
//             optional(commaSep1($._expression)),
//             ')',
//         ),
//
//         _primary_expression: $ => choice(
//             $.identifier,
//             $.integer_literal,
//             $.float_literal,
//             $.char_literal,
//             $.string_literal,
//             $.struct_literal,
//             $.function_literal,
//             $.array_literal,
//             seq('(', $._expression, ')'),
//         ),
//
//         array_literal: $ => seq(
//             '[',
//             optional(commaSep1($._expression)),
//             ']',
//         ),
//
//         function_literal: $ => seq(
//             'fn',
//             field('generic_constr', optional($.generic_constr)),
//             $.function_params,
//             optional(seq(
//                 '->',
//                 field('type', $._type)
//             )),
//             field('body', $.block)
//         ),
//
//         call_expression: $ => prec.left(8, seq(
//             field('function', $._expression),
//             field('genric_args', optional(seq('#', $.generic_params))),
//             '(',
//             optional(commaSep1($._expression)),
//             ')'
//         )),
//
//         member_expression: $ => prec.left(8, seq(
//             field('object', $._expression),
//             field('genric_args', optional(seq('#', $.generic_params))),
//             '.',
//             field('property', $.identifier)
//         )),
//
//         index_expression: $ => prec.left(8, seq(
//             field('array', $._expression),
//             '[',
//             field('index', $._expression),
//             ']'
//         )),
//
//         unary_expression: $ => prec(7, choice(
//             seq('-', $._expression),
//             seq('!', $._expression),
//             seq('~', $._expression),
//             seq('&', $._expression),
//             seq('*', $._expression),
//         )),
//
//         binary_expression: $ => choice(
//             prec.left(6, seq(field('left', $._expression), field('operator', choice('*', '/', '%')), field('right', $._expression))),
//             prec.left(5, seq(field('left', $._expression), field('operator', choice('+', '-', '|', '^', '&^', '&')), field('right', $._expression))),
//             prec.left(4, seq(field('left', $._expression), field('operator', choice('<<', '>>')), field('right', $._expression))),
//             prec.left(3, seq(field('left', $._expression), field('operator', choice('==', '!=', '<', '>', '<=', '>=')), field('right', $._expression))),
//             prec.left(2, seq(field('left', $._expression), field('operator', '&&'), field('right', $._expression))),
//             prec.left(1, seq(field('left', $._expression), field('operator', '||'), field('right', $._expression))),
//         ),
//
//         // +------------+
//         // | Attributes |
//         // +------------+
//
//         attribute: $ => seq(
//             '@',
//             field('name', $.identifier),
//             optional($.attribute_args),
//         ),
//
//         attribute_args: $ => seq(
//             '(',
//             commaSep1($.attribute_pair),
//             ')',
//         ),
//
//         attribute_pair: $ => seq(
//             field('key', $.identifier),
//             '=',
//             field('value', $.string_literal),
//         ),
//
//         // +-------+
//         // | Types |
//         // +-------+
//
//         _type: $ => choice(
//             $.id_type,
//             $.ptr_type,
//             $.array_ptr_type,
//             $.array_type,
//             $.slice_type,
//             $.generic_id_type,
//             $.dynamic_id_type,
//             $.module_type,
//             $.function_type,
//         ),
//
//         _typeExcludedModule: $ => choice(
//             $.id_type,
//             $.ptr_type,
//             $.array_ptr_type,
//             $.array_type,
//             $.slice_type,
//             $.generic_id_type,
//             $.dynamic_id_type,
//             $.function_type,
//         ),
//
//
//         module_type: $ => seq(
//             field("module_name", $.identifier),
//             '.',
//             field("type", $._typeExcludedModule),
//         ),
//
//         function_type: $ => seq(
//             'fn',
//             $.function_type_params,
//             optional(seq(
//                 '->',
//                 field('return_type', $._type)
//             )),
//         ),
//
//         function_type_params: $ => seq(
//             '(',
//             optional(commaSep1($._type)),
//             ')',
//         ),
//
//         id_type: $ => seq($.identifier),
//
//         ptr_type: $ => seq(
//             '*',
//             field('kind', optional('const')),
//             field('base', $._type),
//         ),
//
//         array_ptr_type: $ => seq(
//             '[*]',
//             field('kind', optional('const')),
//             field('base', $._type),
//         ),
//
//         array_type: $ => seq(
//             '[',
//             field('size', $.integer_literal),
//             ']',
//             field('kind', optional('const')),
//             field('base', $._type),
//         ),
//
//         slice_type: $ => seq(
//             '[]',
//             field('kind', optional('const')),
//             field('base', $._type),
//         ),
//
//         generic_id_type: $ => seq(
//             field('name', $.identifier),
//             field('arguments', $.generic_params),
//         ),
//
//         generic_params: $ => seq(
//             '<',
//             commaSep1($._type),
//             '>',
//         ),
//
//         dynamic_id_type: $ => seq(
//             'dyn',
//             field('base', $.id_type),
//         ),
//
//         complex_type: $ => choice(
//             $._type,
//             $.struct_type,
//             $.interface_type,
//         ),
//
//         struct_type: $ => seq(
//             'struct',
//             $.struct_body,
//         ),
//
//         struct_body: $ => seq(
//             '{',
//             field('members', optional(commaSep1Trailing($.struct_pair))),
//             '}',
//         ),
//
//         struct_pair: $ => seq(
//             field('visibility', optional('pub')),
//             field('name', $.identifier),
//             ':',
//             field('type', $._type),
//         ),
//
//         interface_type: $ => seq(
//             'interface',
//             '{',
//             optional(choice(
//                 field('method_body', $.interface_method_body),
//                 field('type_body', $.interface_type_body)
//             )),
//             '}',
//         ),
//
//         interface_method_body: $ => commaSep1Trailing(
//             choice(
//                 $.interface_method,
//                 $.id_type
//             ),
//         ),
//
//         interface_method: $ => $.function_sign,
//
//         interface_type_body: $ => seq(
//             'type',
//             field('types', pipeSep1($._type)),
//             optional(','),
//         ),
//
//         // +---------+
//         // | Imports |
//         // +---------+
//
//         _imports: $ => choice(
//             $.global_import,
//             $.alias_import,
//         ),
//
//         _generic_import: $ => seq(
//             '@import',
//             '(',
//             field('path', $.string_literal),
//             ')',
//         ),
//
//         global_import: $ => seq(
//             'using',
//             $._generic_import,
//             ';',
//         ),
//
//         alias_import: $ => seq(
//             $.identifier,
//             '=',
//             $._generic_import,
//             ';',
//         ),
//
//         // +------+
//         // | Misc |
//         // +------+
//
//         string_literal: $ => /"([^"\\]|\\.)*"/,
//         identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
//         integer_literal: $ => /(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|[1-9]\d*|0)/,
//         float_literal: $ => token(prec(1, /\d+\.\d+(?:[eE][+-]?\d+)?/)),
//         char_literal: $ => /'(?:[^\\'\n]|\\(?:['"\\abfnrtv]|[0-7]{3}|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}))'/,
//     }
// });
//
// function commaSep1(rule) {
//     return seq(rule, repeat(seq(',', rule)));
// }
//
// function commaSep1Trailing(rule) {
//     return seq(rule, repeat(seq(',', rule)), optional(','))
// }
//
// function pipeSep1(rule) {
//     return seq(rule, repeat(seq('|', rule)));
// }
