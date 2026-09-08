module.exports = grammar({
    name: 'naoslang',

    extras: $ => [
        /\s/,
        $.comment_line,
        $.comment_multiline,
    ],

    rules: {
        source_file: $ => seq(
            repeat($._imports),
            repeat($._program),
        ),

        _program: $ => choice(
            $.glob_variable_declaration,
            $.function_definition,
            $.type_extension,
            $._new_types
        ),

        // +----------+
        // | Comments |
        // +----------+

        comment_line: $ => token(seq('//', /.*/)),

        comment_multiline: $ => token(seq(
            '/*',
            repeat(choice(
                /[^*]/,                 // Qualsiasi carattere tranne *
                seq(/\*+/, /[^/*]/)     // Asterischi non seguiti da /
            )),
            /\*+\//                     // Chiusura solida
        )),

        // +----------------+
        // | Type Extension |
        // +----------------+

        type_extension: $ => seq(
            'extends',
            field('type', $._type),
            '{',
            field('functions', repeat($.function_definition)),
            '}',
        ),


        // +-----------+
        // | New Types |
        // +-----------+

        _new_types: $ => choice(
            $.new_type,
            $.alias_type,
        ),

        alias_type: $ => seq(
            field('attributes', optional(repeat($.attribute))),
            field('visibility', optional('pub')),
            'type',
            field('name', $.identifier),
            '=',
            field('base', $._type),
            ';'
        ),

        new_type: $ => seq(
            field('attributes', optional(repeat($.attribute))),
            field('visibility', optional('pub')),
            'type',
            field('name', $.identifier),
            field('generic_params', optional($.generic_params)),
            '::',
            $.complex_type,
            ';'
        ),

        // +-----------+
        // | Variables |
        // +-----------+

        glob_variable_declaration: $ => seq(
            field('attributes', optional(repeat($.attribute))),
            field('visibility', optional('pub')),
            $.variable_declaration,
        ),

        variable_declaration: $ => seq(
            field('kind', choice('let', 'const')),
            field('name', $.identifier),
            choice(
                seq(':', field('type', $._type), '='),
                ':=',
            ),

            field('value', $._expression),
            ';'
        ),

        // +-----------+
        // | Functions |
        // +-----------+

        function_definition: $ => seq(
            field('attributes', optional(repeat($.attribute))),
            field('visibility', optional('pub')),
            $.function_sign,
            field('body', $.block)
        ),

        function_sign: $ => seq(
            'fn',
            field('name', $.identifier),
            field('generic_params', optional($.generic_params)),
            $.function_params,
            optional(seq(
                '->',
                field('type', $._type)
            )),
        ),

        function_params: $ => seq(
            '(',
            optional($.function_params_content),
            ')',
        ),

        function_params_content: $ => choice(
            seq(
                field('self', $.self_parameter),
                optional(seq(',', commaSep1($.parameter))),
            ),
            commaSep1($.parameter),
        ),

        self_parameter: $ => seq(
            'self',
            ':',
            $._type,
        ),

        parameter: $ => seq(
            $.identifier,
            ':',
            $._type,
        ),

        block: $ => seq(
            '{',
            repeat($._statement),
            '}'
        ),

        _statement: $ => choice(
            $.variable_declaration,
            $.return_statement,
            $.assignment_statement,
            $.update_statement,
            $.break_statement,
            $.defer_statement,
            $.continue_statement,
            $.loop_statement,
            $.if_statement,
            seq($._expression, ';'),
        ),

        return_statement: $ => seq(
            'return',
            optional($._expression),
            ';'
        ),

        break_statement: $ => seq('break', ';'),
        continue_statement: $ => seq('continue', ';'),

        defer_statement: $ => seq(
            'defer',
            $._expression,
            ';',
        ),

        loop_statement: $ => seq(
            'loop',
            $.block,
        ),

        if_statement: $ => seq(
            'if',
            field('condition', $._expression),
            $.block,
        ),

        assignment_statement: $ => seq(
            field('left', $._expression),
            field('operator', choice(
                '=',
                '+=', '-=', '*=', '/=', '%=',
                '&=', '|=', '^=', '<<=', '>>=', '&^='
            )),
            field('right', $._expression),
            ';'
        ),

        update_statement: $ => seq(
            field('argument', $._expression),
            field('operator', choice('++', '--')),
            ';'
        ),

        // +-------------+
        // | Expressions |
        // +-------------+

        _expression: $ => choice(
            $.binary_expression,
            $.unary_expression,
            $.call_expression,
            $.member_expression,
            $.index_expression,
            $.function_expression,
            $._primary_expression,
        ),

        _primary_expression: $ => choice(
            $.identifier,
            $.integer_literal,
            $.float_literal,
            $.char_literal,
            $.string_literal,
            seq('(', $._expression, ')'),
        ),

        function_expression: $ => seq(
            'fn',
            field('generic_params', optional($.generic_params)),
            $.function_params,
            optional(seq(
                '->',
                field('type', $._type)
            )),
            field('body', $.block)
        ),

        call_expression: $ => prec.left(8, seq(
            field('function', $._expression),
            '(',
            optional(commaSep1($._expression)),
            ')'
        )),

        member_expression: $ => prec.left(8, seq(
            field('object', $._expression),
            '.',
            field('property', $.identifier)
        )),

        index_expression: $ => prec.left(8, seq(
            field('array', $._expression),
            '[',
            field('index', $._expression),
            ']'
        )),

        unary_expression: $ => prec(7, choice(
            seq('-', $._expression),
            seq('!', $._expression),
            seq('~', $._expression),
            seq('&', $._expression),
            seq('*', $._expression),
        )),

        binary_expression: $ => choice(
            prec.left(6, seq(field('left', $._expression), field('operator', choice('*', '/', '%')), field('right', $._expression))),
            prec.left(5, seq(field('left', $._expression), field('operator', choice('+', '-', '|', '^', '&^', '&')), field('right', $._expression))),
            prec.left(4, seq(field('left', $._expression), field('operator', choice('<<', '>>')), field('right', $._expression))),
            prec.left(3, seq(field('left', $._expression), field('operator', choice('==', '!=', '<', '>', '<=', '>=')), field('right', $._expression))),
            prec.left(2, seq(field('left', $._expression), field('operator', '&&'), field('right', $._expression))),
            prec.left(1, seq(field('left', $._expression), field('operator', '||'), field('right', $._expression))),
        ),

        // +------------+
        // | Attributes |
        // +------------+

        attribute: $ => seq(
            '@',
            field('name', $.identifier),
            optional($.attribute_args),
        ),

        attribute_args: $ => seq(
            '(',
            commaSep1($.attribute_pair),
            ')',
        ),

        attribute_pair: $ => seq(
            field('key', $.identifier),
            '=',
            field('value', $.string_literal),
        ),

        // +-------+
        // | Types |
        // +-------+

        _type: $ => choice(
            $.id_type,
            $.ptr_type,
            $.array_ptr_type,
            $.array_type,
            $.slice_type,
            $.generic_id_type,
            $.dynamic_id_type,
            $.function_type,
        ),

        function_type: $ => seq(
            'fn',
            '(',
            field('params', optional(commaSep1($._type))),
            ')',
            optional(seq(
                '->',
                field('return_type', $._type)
            )),
        ),

        id_type: $ => seq($.identifier),

        ptr_type: $ => seq(
            '*',
            field('kind', optional('const')),
            field('base', $._type),
        ),

        array_ptr_type: $ => seq(
            '[*]',
            field('kind', optional('const')),
            field('base', $._type),
        ),

        array_type: $ => seq(
            '[',
            field('size', $.integer_literal),
            ']',
            field('kind', optional('const')),
            field('base', $._type),
        ),

        slice_type: $ => seq(
            '[]',
            field('kind', optional('const')),
            field('base', $._type),
        ),

        generic_id_type: $ => seq(
            field('name', $.identifier),
            field('arguments', $.generic_params),
        ),

        generic_params: $ => seq(
            '<',
            field('types', commaSep1($._type)),
            '>',
        ),

        dynamic_id_type: $ => seq(
            'dyn',
            field('base', $.id_type),
        ),

        complex_type: $ => choice(
            $._type,
            $.struct_type,
            $.interface_type,
        ),

        struct_type: $ => seq(
            'struct',
            $.struct_body,
        ),

        struct_body: $ => seq(
            '{',
            field('members', optional(commaSep1Trailing($.struct_pair))),
            '}',
        ),

        struct_pair: $ => seq(
            field('visibility', optional('pub')),
            field('name', $.identifier),
            ':',
            field('type', $._type),
        ),

        interface_type: $ => seq(
            'interface',
            '{',
            optional(choice(
                field('method_body', $.interface_method_body),
                field('type_body', $.interface_type_body)
            )),
            '}',
        ),

        interface_method_body: $ => commaSep1Trailing(
            choice(
                $.interface_method,
                $.id_type
            ),
        ),

        interface_method: $ => $.function_sign,

        interface_type_body: $ => seq(
            'type',
            field('types', pipeSep1($._type)),
            optional(','),
        ),

        // +---------+
        // | Imports |
        // +---------+

        _imports: $ => choice(
            $.global_import,
            $.alias_import,
        ),

        _generic_import: $ => seq(
            '@import',
            '(',
            field('path', $.string_literal),
            ')',
        ),

        global_import: $ => seq(
            'using',
            $._generic_import,
            ';',
        ),

        alias_import: $ => seq(
            $.identifier,
            '=',
            $._generic_import,
            ';',
        ),

        // +------+
        // | Misc |
        // +------+

        string_literal: $ => /"([^"\\]|\\.)*"/,
        identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
        integer_literal: $ => /(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|[1-9]\d*|0)/,
        float_literal: $ => token(prec(1, /\d+\.\d+(?:[eE][+-]?\d+)?/)),
        char_literal: $ => /'(?:[^\\'\n]|\\(?:['"\\abfnrtv]|[0-7]{3}|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}))'/,
    }
});

function commaSep1(rule) {
    return seq(rule, repeat(seq(',', rule)));
}

function commaSep1Trailing(rule) {
    return seq(rule, repeat(seq(',', rule)), optional(','))
}

function pipeSep1(rule) {
    return seq(rule, repeat(seq('|', rule)));
}
