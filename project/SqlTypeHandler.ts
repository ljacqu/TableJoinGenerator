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

        formatFilterForWhereClause(filter: QueryWhereFilter, table: string, column: string): string {
            if (filter.type === 'datetime_interval') {
                return filter.value
                    .replaceAll('INTERVAL', '<span class="sql-keyword">INTERVAL</span>');
            }

            throw new Error('Unsupported filter of type: ' + filter.type);
        }

        validateColumnFilterElem(table: string, column: string, value: string): string | QueryWhereFilter {
            if (value === '' || value === '!') {
                return value;
            }

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
                    return value;
                case 'timestamp':
                case 'datetime':
                    return this.handleDateTimeValue(value);
                case 'varchar':
                case 'varchar2':
                case 'blob':
                case 'clob':
                    return value;
                default:
                    console.log(`Unhandled validation for ${columnType}`);
                    return value;
            }
        }

        private handleDateTimeValue(value: string): string | QueryWhereFilter {
            const pattern = /([+\-])\s?(\d+)\s?([smhdy])/;
            const matches = value.match(pattern);
            if (matches) {
                const operator = matches[1] === '+' ? '<' : '>';
                const number = matches[2];
                const unit = this.convertDateTimeUnit(matches[3]);

                return {
                    type: 'datetime_interval',
                    value: operator + ` sysdate - INTERVAL '${number}' ${unit}`
                };
            }

            throw Error('Invalid timestamp expression');
        }

        private convertDateTimeUnit(unit: string): string {
            switch (unit) {
                case 's': return 'SECOND';
                case 'm': return 'MINUTE';
                case 'h': return 'HOUR';
                case 'd': return 'DAY';
                case 'y': return 'YEAR';
                default:
                    throw new Error(`Unhandled unit: ${unit}`);
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
