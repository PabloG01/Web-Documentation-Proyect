import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Font } from '@react-pdf/renderer';

// Registrar fuente para mejor renderizado
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu52xP.ttf', fontStyle: 'italic' },
    ]
});

// Estilos para el PDF
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 40,
        fontFamily: 'Roboto',
        fontSize: 11,
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#3498db',
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: '#2c3e50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 20,
    },
    metaItem: {
        flexDirection: 'row',
    },
    metaLabel: {
        fontSize: 10,
        color: '#95a5a6',
        marginRight: 4,
    },
    metaValue: {
        fontSize: 10,
        color: '#2c3e50',
        fontWeight: 700,
    },
    content: {
        flex: 1,
    },
    h1: {
        fontSize: 20,
        fontWeight: 700,
        color: '#2c3e50',
        marginTop: 20,
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    h2: {
        fontSize: 16,
        fontWeight: 700,
        color: '#34495e',
        marginTop: 16,
        marginBottom: 8,
    },
    h3: {
        fontSize: 14,
        fontWeight: 700,
        color: '#34495e',
        marginTop: 12,
        marginBottom: 6,
    },
    paragraph: {
        fontSize: 11,
        color: '#2c3e50',
        marginBottom: 10,
        textAlign: 'justify',
    },
    bold: {
        fontWeight: 700,
    },
    italic: {
        fontStyle: 'italic',
    },
    code: {
        fontFamily: 'Courier',
        fontSize: 10,
        backgroundColor: '#f4f4f4',
        padding: 2,
    },
    codeBlock: {
        fontFamily: 'Courier',
        fontSize: 9,
        backgroundColor: '#2d2d2d',
        color: '#f8f8f2',
        padding: 12,
        marginVertical: 10,
        borderRadius: 4,
    },
    codeLine: {
        fontFamily: 'Courier',
        fontSize: 9,
        color: '#f8f8f2',
        lineHeight: 1.4,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 10,
    },
    bullet: {
        width: 15,
        fontSize: 11,
    },
    listText: {
        flex: 1,
        fontSize: 11,
        color: '#2c3e50',
    },
    blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: '#3498db',
        paddingLeft: 12,
        marginVertical: 10,
        backgroundColor: '#f8f9fa',
        padding: 10,
    },
    blockquoteText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: '#666',
    },
    link: {
        color: '#3498db',
        textDecoration: 'underline',
    },
    hr: {
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
        marginVertical: 15,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#95a5a6',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingTop: 10,
    },
});

/**
 * Parsea el contenido Markdown y devuelve un array de elementos
 */
const parseMarkdown = (content) => {
    if (!content) return [];

    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';
    let listItems = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Detectar bloques de código
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockLang = line.trim().replace('```', '');
                codeBlockContent = '';
            } else {
                inCodeBlock = false;
                elements.push({ type: 'codeBlock', content: codeBlockContent, lang: codeBlockLang });
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent += (codeBlockContent ? '\n' : '') + line;
            continue;
        }

        // Finalizar lista si la línea no es un item de lista
        if (inList && !line.trim().match(/^[-*+]\s/) && !line.trim().match(/^\d+\.\s/)) {
            if (listItems.length > 0) {
                elements.push({ type: 'list', items: [...listItems] });
                listItems = [];
            }
            inList = false;
        }

        // Headers
        if (line.startsWith('### ')) {
            elements.push({ type: 'h3', content: parseInlineMarkdown(line.slice(4)) });
        } else if (line.startsWith('## ')) {
            elements.push({ type: 'h2', content: parseInlineMarkdown(line.slice(3)) });
        } else if (line.startsWith('# ')) {
            elements.push({ type: 'h1', content: parseInlineMarkdown(line.slice(2)) });
        }
        // Línea horizontal
        else if (line.trim().match(/^[-*_]{3,}$/)) {
            elements.push({ type: 'hr' });
        }
        // Blockquote
        else if (line.startsWith('> ')) {
            elements.push({ type: 'blockquote', content: parseInlineMarkdown(line.slice(2)) });
        }
        // Listas (- * + o numeradas)
        else if (line.trim().match(/^[-*+]\s/) || line.trim().match(/^\d+\.\s/)) {
            inList = true;
            const listContent = line.replace(/^\s*[-*+]\s/, '').replace(/^\s*\d+\.\s/, '');
            listItems.push(parseInlineMarkdown(listContent));
        }
        // Párrafo normal
        else if (line.trim()) {
            elements.push({ type: 'paragraph', content: parseInlineMarkdown(line) });
        }
    }

    // Si quedaron items de lista sin procesar
    if (listItems.length > 0) {
        elements.push({ type: 'list', items: listItems });
    }

    return elements;
};

/**
 * Parsea markdown inline (bold, italic, code, links)
 */
const parseInlineMarkdown = (text) => {
    if (!text) return [{ type: 'text', content: '' }];

    const elements = [];
    let remaining = text;

    // Regex para detectar patrones inline
    const patterns = [
        { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
        { regex: /__(.+?)__/g, type: 'bold' },
        { regex: /\*(.+?)\*/g, type: 'italic' },
        { regex: /_(.+?)_/g, type: 'italic' },
        { regex: /`(.+?)`/g, type: 'code' },
        { regex: /\[(.+?)\]\((.+?)\)/g, type: 'link' },
    ];

    // Buscar el primer match
    let firstMatch = null;
    let firstMatchIndex = Infinity;
    let matchedPattern = null;

    for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex.source, 'g');
        const match = regex.exec(remaining);
        if (match && match.index < firstMatchIndex) {
            firstMatch = match;
            firstMatchIndex = match.index;
            matchedPattern = pattern;
        }
    }

    if (!firstMatch) {
        return [{ type: 'text', content: text }];
    }

    // Texto antes del match
    if (firstMatchIndex > 0) {
        elements.push({ type: 'text', content: remaining.slice(0, firstMatchIndex) });
    }

    // El elemento match
    if (matchedPattern.type === 'link') {
        elements.push({ type: 'link', content: firstMatch[1], href: firstMatch[2] });
    } else {
        elements.push({ type: matchedPattern.type, content: firstMatch[1] });
    }

    // Texto después del match (recursivo)
    const afterMatch = remaining.slice(firstMatchIndex + firstMatch[0].length);
    if (afterMatch) {
        elements.push(...parseInlineMarkdown(afterMatch));
    }

    return elements;
};

/**
 * Renderiza elementos inline
 */
const renderInlineElements = (elements) => {
    return elements.map((el, idx) => {
        switch (el.type) {
            case 'bold':
                return <Text key={idx} style={styles.bold}>{el.content}</Text>;
            case 'italic':
                return <Text key={idx} style={styles.italic}>{el.content}</Text>;
            case 'code':
                return <Text key={idx} style={styles.code}>{el.content}</Text>;
            case 'link':
                return <Link key={idx} src={el.href} style={styles.link}>{el.content}</Link>;
            default:
                return <Text key={idx}>{el.content}</Text>;
        }
    });
};

/**
 * Componente principal del documento PDF
 */
const PdfDocument = ({ document }) => {
    const elements = parseMarkdown(document.content);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header con info del documento */}
                <View style={styles.header}>
                    <Text style={styles.title}>{document.title}</Text>
                    {document.description && (
                        <Text style={styles.subtitle}>{document.description}</Text>
                    )}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Autor:</Text>
                            <Text style={styles.metaValue}>{document.author || 'N/A'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Versión:</Text>
                            <Text style={styles.metaValue}>{document.version || '1.0'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Fecha:</Text>
                            <Text style={styles.metaValue}>{formatDate(document.created_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Contenido del documento */}
                <View style={styles.content}>
                    {elements.map((element, index) => {
                        switch (element.type) {
                            case 'h1':
                                return (
                                    <Text key={index} style={styles.h1}>
                                        {renderInlineElements(element.content)}
                                    </Text>
                                );
                            case 'h2':
                                return (
                                    <Text key={index} style={styles.h2}>
                                        {renderInlineElements(element.content)}
                                    </Text>
                                );
                            case 'h3':
                                return (
                                    <Text key={index} style={styles.h3}>
                                        {renderInlineElements(element.content)}
                                    </Text>
                                );
                            case 'paragraph':
                                return (
                                    <Text key={index} style={styles.paragraph}>
                                        {renderInlineElements(element.content)}
                                    </Text>
                                );
                            case 'codeBlock':
                                return (
                                    <View key={index} style={styles.codeBlock}>
                                        {element.content.split('\n').map((line, lineIdx) => (
                                            <Text key={lineIdx} style={styles.codeLine}>
                                                {line.replace(/ /g, '\u00A0') || '\u00A0'}
                                            </Text>
                                        ))}
                                    </View>
                                );
                            case 'list':
                                return (
                                    <View key={index}>
                                        {element.items.map((item, itemIdx) => (
                                            <View key={itemIdx} style={styles.listItem}>
                                                <Text style={styles.bullet}>•</Text>
                                                <Text style={styles.listText}>
                                                    {renderInlineElements(item)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                );
                            case 'blockquote':
                                return (
                                    <View key={index} style={styles.blockquote}>
                                        <Text style={styles.blockquoteText}>
                                            {renderInlineElements(element.content)}
                                        </Text>
                                    </View>
                                );
                            case 'hr':
                                return <View key={index} style={styles.hr} />;
                            default:
                                return null;
                        }
                    })}
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {document.title} - Generado el {new Date().toLocaleDateString('es-ES')}
                </Text>
            </Page>
        </Document>
    );
};

export default PdfDocument;
