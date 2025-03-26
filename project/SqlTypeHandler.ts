namespace QB {

    export class SqlTypeHandler {

        constructor(private dbEngine: string) {
        }

        formatFilterForWhereClause(filter: ColumnFilter): string {
            switch (filter.type) {
                case ColumnFilterType.PLAIN:
                    return this.formatValueForWhereClause(filter);
                case ColumnFilterType.NULL_FILTER:
                    return this.formatNullFilterForWhereClause(filter);
                case ColumnFilterType.TIMESTAMP_INTERVAL:
                    return this.formatIntervalFilterForWhereClause(filter);
                default:
                    throw new Error('Unhandled filter type: ' + filter.type);
            }
        }

        private formatValueForWhereClause(filter: ColumnFilter): string {
            const columnType = TableDefinitions.getColumnType(filter.table, filter.column);
            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    return `= <span class="sql-number">${filter.value}</span>`;
                default: // quote by default
                    return `= <span class="sql-text">'`
                        + this.escapeValueForSqlAndHtml(filter.value)
                        + `'</span>`;
            }
        }

        private formatIntervalFilterForWhereClause(filter: ColumnFilter): string {
            return filter.value
                .replaceAll('INTERVAL', '<span class="sql-keyword">INTERVAL</span>');
        }

        private formatNullFilterForWhereClause(filter: ColumnFilter): string {
            return filter.value
                ? '<span class="sql-keyword">IS NOT NULL</span>'
                : '<span class="sql-keyword">IS NULL</span>';
        }

        validateColumnFilterElemOrAlertError(table: string, column: string, value: string,
                                             tableAlias?: string): ColumnFilter | null {
            try {
                return this.validateColumnFilterElem(table, column, value, tableAlias);
            } catch (e: any) {
                window.alert(e.message);
                return null;
            }
        }

        private validateColumnFilterElem(table: string, column: string, value: string,
                                         tableAlias?: string): ColumnFilter {
            if (value === '' || value === '!') {
                return ColumnFilter.nullFilter(table, column, value, tableAlias);
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
                    return ColumnFilter.plainFilter(table, column, value, tableAlias);
                case 'timestamp':
                case 'datetime':
                    return this.handleDateTimeValue(table, column, value);
                case 'varchar':
                case 'varchar2':
                case 'blob':
                case 'clob':
                    return ColumnFilter.plainFilter(table, column, value, tableAlias);
                default:
                    console.log(`Unhandled validation for ${columnType}`);
                    return ColumnFilter.plainFilter(table, column, value, tableAlias);
            }
        }

        private handleDateTimeValue(table: string, column: string, value: string, tableAlias?: string): ColumnFilter {
            // Match stuff like "> 3d" or "<= -5h", or shorthand "+2h" / "-50s"
            // Groups: (>)? (-)? (3) (h)
            const pattern = /^(>|>=|=|<=|<|<>)?\s*([+\-])?\s*(\d+)\s*([smhdy])$/;
            const matches = value.trim().match(pattern);
            if (matches) {
                const operator = matches[2] ?? '+';
                const comparison = matches[1] ?? (operator === '+' ? '<' : '>');
                const number = matches[3];
                const unit = this.convertDateTimeUnit(matches[4]);

                const expression = this.dbEngine === 'MySQL'
                    ? `${comparison} NOW() ${operator} INTERVAL ${number} ${unit}`
                    : `${comparison} sysdate ${operator} INTERVAL '${number}' ${unit}`; // Oracle

                return new ColumnFilter(table, column, ColumnFilterType.TIMESTAMP_INTERVAL,
                    expression, value, tableAlias);
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
