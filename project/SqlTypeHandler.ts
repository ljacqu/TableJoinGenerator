namespace QB {

    export class SqlTypeHandler {

        formatValueForWhereClause(value: string, table: string, column: string): string {
            const columnType = TableDefinitions.getColumnType(table, column);
            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    return `<span class="sql-number">${value}</span>`;
                default: // quote by default
                    return `<span class="sql-text">'`
                        + this.escapeValueForSqlAndHtml(value)
                        + `'</span>`;
            }
        }

        validateColumnFilterElem(table: string, column: string, value: string | null): void {
            let columnType = TableDefinitions.getColumnType(table, column);
            if (columnType.startsWith('timestamp')) {
                columnType = 'timestamp';
            }

            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    if (value && value !== '!' && Number.isNaN(Number(value))) {
                        throw new Error('Invalid number');
                    }
                    break;
                case 'varchar':
                case 'varchar2':
                case 'timestamp':
                case 'datetime':
                case 'blob':
                case 'clob':
                    break;
                default:
                    console.log(`Unhandled validation for ${columnType}`);
            }
        }

        private escapeValueForSqlAndHtml(value: string): string {
            return value
                .replaceAll('\'', '\'\'')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;');
        }
    }
}
