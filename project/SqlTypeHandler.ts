namespace QB {

    export class SqlTypeHandler {

        constructor(private dbEngine: string) {
        }

        formatFilterForWhereClause(table: string, filter: ColumnFilter): string {
            switch (filter.type) {
                case ColumnFilterType.PLAIN:
                    return this.formatValueForWhereClause(table, filter);
                case ColumnFilterType.TIMESTAMP_INTERVAL:
                    return this.formatIntervalFilterForWhereClause(table, filter);
                default:
                    throw new Error('Unhandled filter type: ' + filter.type);
            }
        }

        private formatValueForWhereClause(table: string, filter: ColumnFilter): string {
            const columnType = TableDefinitions.getColumnType(table, filter.column);
            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    return `<span class="sql-number">${filter.value}</span>`;
                default: // quote by default
                    return `<span class="sql-text">'`
                        + this.escapeValueForSqlAndHtml(filter.value)
                        + `'</span>`;
            }
        }

        private formatIntervalFilterForWhereClause(table: string, filter: ColumnFilter): string {
            return filter.value
                .replaceAll('INTERVAL', '<span class="sql-keyword">INTERVAL</span>');
        }

        validateColumnFilterElem(table: string, column: string, value: string): ColumnFilter {
            if (value === '' || value === '!') {
                return ColumnFilter.plainFilter(column, value);
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
                    return ColumnFilter.plainFilter(column, value);
                case 'timestamp':
                case 'datetime':
                    return this.handleDateTimeValue(column, value);
                case 'varchar':
                case 'varchar2':
                case 'blob':
                case 'clob':
                    return ColumnFilter.plainFilter(column, value);
                default:
                    console.log(`Unhandled validation for ${columnType}`);
                    return ColumnFilter.plainFilter(column, value);
            }
        }

        private handleDateTimeValue(column: string, value: string): ColumnFilter {
            const pattern = /([+\-])\s?(\d+)\s?([smhdy])/;
            const matches = value.match(pattern);
            if (matches) {
                const operator = matches[1] === '+' ? '<' : '>';
                const number = matches[2];
                const unit = this.convertDateTimeUnit(matches[3]);

                const expression = this.dbEngine === 'MySQL'
                    ? `NOW() - INTERVAL ${number} ${unit}`
                    : `sysdate - INTERVAL '${number}' ${unit}`; // Oracle

                return new ColumnFilter(column, ColumnFilterType.TIMESTAMP_INTERVAL, operator + ' ' + expression);
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
