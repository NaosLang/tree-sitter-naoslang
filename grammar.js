const exprExcept = ($, ...excluded) => {
    const exprs = [

    ];

    return choice(...exprs.filter(e => !excluded.includes(e)))
}

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
        $.struct_type,
        $.interface_type,
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
        $.struct_literal,
    ];
    return choice(...literals.filter(t => !excluded.includes(t)))
};


module.exports = grammar({
    name: 'naoslang',

    conflicts: $ => [
    ],

    rules: {
        source_file: $ => seq(
            // imports are valid only on top of the file
            repeat($._imports),
            repeat($._program),
        ),

        _program: $ => choice(
            $._new_type,
            $.func_def,
            $.global_variable_def,
            $.type_extension,
        ),

        // +------+
        // | Misc |
        // +------+

        not_implemented_syntax: $ => token('\0'),

        generic_def_params: $ => _params_wrapper('<', $.id_type_pair, '>'),
        id_type_pair: $ => seq(
            field('name', $.id_literal),
            ':',
            field('type', $._primitive_type),
        ),


        // +-----------------+
        // | Type Extensions |
        // +-----------------+

        type_extension: $ => seq(
            'extends',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            $.type_extension_body,
        ),

        type_extension_body: $ => seq(
            '{',
            repeat($.func_def),
            '}',
        ),

        // +-----------+
        // | New Types |
        // +-----------+

        _new_type: $ => choice(
            $.alias_type,
            $.new_type,
        ),

        alias_type: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', 'pub')),
            'type',
            field('name', $.id_literal),
            '=',
            field('base', $._primitive_type),
            ';',
        ),

        new_type: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', 'pub')),
            'type',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            '::',
            field('base', $._type),
            ';',
        ),


        // +--------------+
        // | Variable_Def |
        // +--------------+

        global_variable_def: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', 'pub')),
            $._generic_variable,
        ),

        local_variable_def: $ => $._generic_variable,

        _generic_variable: $ => seq(
            field('kind', choice('const', 'let')),
            field('name', $.id_literal),
            ':',
            optional(field('type', $._primitive_type)),
            '=',
            $.not_implemented_syntax, // expression
            ';'
        ),

        // +--------------+
        // | Function Def |
        // +--------------+

        func_def: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            $.func_sign,
            field('body', $.block)
        ),

        func_sign: $ => seq(
            'fn',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            field('parameters', $.func_literal_params),
            optional($._func_literal_return),
        ),

        // +----------+
        // | Compiler |
        // +----------+

        compiler_attributes: $ => repeat1($.compiler_attribute),

        compiler_attribute: $ => seq(
            '@',
            field('name', $.id_literal),
            optional(field('arguments', $.compiler_attribute_args)),
        ),

        compiler_attribute_args: $ => seq(
            '(',
            separatedByTrailing(',', $.compiler_attribute_pair),
            ')',
        ),

        compiler_attribute_pair: $ => seq(
            field('key', $.id_literal),
            '=',
            field('value', $._string_literal),
        ),

        // +-------+
        // | Block |
        // +-------+

        block: $ => seq(
            '{',
            optional($.block_statements),
            '}',
        ),

        block_statements: $ => repeat1($._statement),


        // +------------+
        // | Statements |
        // +------------+

        _statement: $ => choice(
            $.local_variable_def,
        ),

        // +-------------+
        // | Expressions |
        // +-------------+

        _expressions: $ => exprExcept($),
        _value_expressions: $ => exprExcept($),

        // +---------+
        // | Imports |
        // +---------+

        _imports: $ => choice($.global_import, $.alias_import), // all imports

        _generic_import: $ => seq(
            '@',
            'import',
            '(',
            field('path', choice($.str_literal, $.raw_str_literal)),
            ')',
        ),

        global_import: $ => seq('using', $._generic_import, ';'), // using @import(PATH);
        alias_import: $ => seq(field('alias', $.id_literal), '=', $._generic_import, ';'), // id = @import(PATH);


        // +-------+
        // | Types |
        // +-------+

        _type: $ => typeExcept($), // all types
        _primitive_type: $ => typeExcept($, $.struct_type, $.interface_type), // all types expect interfaces and structs



        id_type: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),
        ptr_type: $ => seq(
            '*',
            optional(field('const', prec(1, 'const'))),
            field('base', $._primitive_type)
        ), // *PTYPE



        arr_ptr_type: $ => seq(
            '[*]',
            optional(field('const', prec(1, 'const'))),
            field('base', $._primitive_type)
        ), // [*]PTYPE

        slice_type: $ => seq(
            '[]',
            optional(field('const', prec(1, 'const'))),
            field('base', $._primitive_type)
        ), // []PTYPE

        arr_type: $ => seq(
            '[',
            field('size', $.int_literal),
            ']',
            optional(field('const', prec(1, 'const'))),
            field('base', $._primitive_type),
        ), // [N]PTYPE



        func_type_param: $ => seq(
            optional(field('const', prec(1, 'const'))),
            field('type', $._primitive_type),
        ),

        func_type_params: $ => _params_wrapper('(', $.func_type_param, ')'),
        _func_type_return: $ => seq('->', field('return', $._primitive_type)),

        func_type: $ => seq(
            'fn',
            field('parameters', $.func_type_params),
            optional($._func_type_return),
        ), // fn(PARAMS) -> PTYPE



        module_type: $ => seq(field('module', $.id_literal), '.', field('type', $.id_type)), // id.id



        genric_type_params: $ => _params_wrapper('<', $._primitive_type, '>'),
        generic_type: $ => seq(field('name', $.id_type), field('parameters', $.genric_type_params)), // id<PTYPE...>


        struct_type_members: $ => _params_wrapper('{', optional($.id_type_pair), '}'),
        struct_type: $ => seq(
            'struct',
            field('struct_members', $.struct_type_members)
        ),



        _interface_type_members: $ => choice(
            $.interface_type_members,
            seq(
                'type',
                field('interface_types', $.interface_typed_type_members),
            ),
        ),

        interface_typed_type_members: $ => seq(
            separatedBy('|', $._primitive_type),
            optional(','),
        ),

        interface_type_members: $ => separatedByTrailing(',', choice($.id_literal, $.func_sign)),

        interface_type: $ => seq(
            'interface',
            '{',
            optional(field('interface_members', $._interface_type_members)),
            '}',
        ),

        // +----------+
        // | Literals |
        // +----------+

        _literal: $ => literalExcept($), // all literals
        _nestable_literal: $ => choice($.id_literal, $.struct_literal, $.nested_literal), // all literals that support the id.LIT
        _string_literal: $ => choice($.str_literal, $.raw_str_literal),



        id_literal: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),



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

        raw_str_literal: $ => token(seq(
            '`',
            repeat(/[^`]/),
            '`',
        )),

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



        int_literal: $ => token(choice(
            seq('0', choice('x', 'X'), _digits(/[0-9a-fA-F]/)), // hexadecimal integer
            seq(/[1-9]/, repeat(_digits(/[0-9]/))),                     // decimal integer
            seq('0', choice('o', 'O'), _digits(/[0-7]/)),       // octal integer
            seq('0', choice('b', 'B'), _digits(/[0-1]/)),       // binary integer
            '0', // zero becouse is not a valid int literal '013' in octal or decimal base
        )),

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



        func_literal_param: $ => seq(
            optional(field('const', prec(1, 'const'))),
            field('name', $.id_literal),
            ':',
            field('type', $.id_type),
        ),

        func_literal_params: $ => _params_wrapper('(', $.func_literal_param, ')'),
        _func_literal_return: $ => seq('->', field('return', $._primitive_type)),

        func_literal: $ => seq(
            'fn',
            field('parameters', $.func_literal_params),
            optional($._func_literal_return),
            field('body', $.block),
        ),



        arr_literal: $ => seq('[', repeat($.not_implemented_syntax), ']'),



        struct_literal_member: $ => seq(
            field('name', $.id_literal),
            ':',
            field('value', $.not_implemented_syntax) // expression
        ),

        struct_literal_members: $ => _params_wrapper('{', $.struct_literal_member, '}', true),

        struct_literal: $ => seq(
            field('name', $.id_literal),
            field('members', $.struct_literal_members),
        ),



        nested_literal: $ => seq(
            field('name', $.id_literal),
            field('nested', $._nestable_literal),
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

function _params_wrapper(w1, parmaRule, w2, trailing) {
    if (trailing) {
        return seq(w1, optional(separatedByTrailing(',', parmaRule)), w2)
    }
    return seq(w1, optional(separatedBy(',', parmaRule)), w2)
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
//        $.break_statement,
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
