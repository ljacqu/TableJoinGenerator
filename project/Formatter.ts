namespace QB {

    export class Formatter {

        constructor(private aliasFn: Function, private schema?: string) {
        }

        private formatTable(tableName: string, includeAlias: boolean = false): string {
            const tableReference = this.schema ? `${this.schema}.${tableName}` : tableName;
            if (includeAlias) {
                const alias = this.aliasFn(tableName);
                if (alias) {
                    return tableReference + ' ' + alias;
                }
            }
            return tableReference;
        }

        private formatColumn(tableName: string, columnName: string, useColNameWithTable: boolean = false): string {
            if (!useColNameWithTable) {
                return `<span class="sql-column">${columnName}</span>`;
            }

            const alias = this.aliasFn(tableName);
            const tableReference = alias ? alias : this.formatTable(tableName);
            return `${tableReference}.<span class="sql-column">${columnName}</span>`;
        }

        generateQuery(query?: any): string {
            if (!query) {
                return '';
            }
            return this.produceSql(0, query);
        }

        // TODO: add type to `query`
        private produceSql(level: number, query): string {
            const indent = '    '.repeat(level);
            const nlIndent = '\n' + indent;
            const useColNameWithTable = !!query.leftJoin;

            let result = indent + '<span class="sql-keyword">SELECT</span> ';
            if (query.select?.length > 0) {
                result += query.select
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable))
                    .join('\n     , ');
                if (query.agg) {
                    result += '\n     , <span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                }
            } else {
                if (query.agg) {
                    result += '<span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                } else {
                    result += '<span class="sql-star">*</span>';
                }
            }

            result += nlIndent + '<span class="sql-keyword">FROM</span> ' + this.formatTable(query.table, useColNameWithTable);

            if (query.leftJoin) {
                query.leftJoin.forEach(lj => {
                    result += nlIndent + '<span class="sql-keyword">LEFT JOIN</span> ' + this.formatTable(lj.targetTable, true)
                        + nlIndent + '  <span class="sql-keyword">ON</span> ' + this.formatColumn(lj.targetTable, lj.targetColumn, true)
                        + ' = ' + this.formatColumn(lj.sourceTable, lj.sourceColumn, true);
                });
            }

            if (query.whereIn) {
                result += nlIndent + '<span class="sql-keyword">WHERE</span> ' + this.formatColumn(query.table, query.whereIn, useColNameWithTable) + ' <span class="sql-keyword">IN</span> (';
                result += '\n' + this.produceSql(level + 1, query.sub);
                result += nlIndent + ')';
            }
            if (query.where) {
                if (query.whereIn) { // already have a `WHERE`, now need an `AND`
                    result += nlIndent + '  <span class="sql-keyword">AND</span> ';
                } else {
                    result += nlIndent + '<span class="sql-keyword">WHERE</span> ';
                }
                result += this.formatColumn(query.table, query.where.column, useColNameWithTable);
                if (!query.where.filter) {
                    result += ' <span class="sql-keyword">IS NULL</span>';
                } else if (query.where.filter === '!') {
                    result += ' <span class="sql-keyword">IS NOT NULL</span>';
                } else {
                    result += ' = ' + this.formatValueForWhereClause(query.where.filter, query.table, query.where.column);
                }
            }
            if (query.agg && query.select?.length > 0) {
                result += nlIndent + '<span class="sql-keyword">GROUP BY</span> ' + query.select
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable))
                    .join('\n       , ');
            }
            return result;
        }

        private formatValueForWhereClause(value: string, table: string, column: string): string {
            const columnType = TableDefinitions.getColumnType(table, column);
            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    return `<span class="sql-number">${value}</span>`;
                default: // quote by default
                    return `<span class="sql-text">'`
                        + value.replaceAll('\'', '\'\'').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
                        + `'</span>`;
            }
        }
    }
}