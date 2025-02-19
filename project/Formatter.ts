namespace QB {

    export class Formatter {

        constructor(private sqlTypeHandler: SqlTypeHandler,
                    private aliasFn: (tableName: string) => string | null | undefined,
                    private schema?: string) {
        }

        private formatTable(tableName: string, includeAlias: boolean = false,
                            manualAlias?: string): string {
            const tableReference = this.schema ? `${this.schema}.${tableName}` : tableName;
            if (includeAlias) {
                const alias = manualAlias ?? this.aliasFn(tableName);
                if (alias) {
                    return tableReference + ' ' + alias;
                }
            }
            return tableReference;
        }

        private formatColumn(tableName: string, columnName: string, useColNameWithTable: boolean,
                             manualAlias?: string): string {
            if (!useColNameWithTable) {
                return `<span class="sql-column">${columnName}</span>`;
            }

            const alias = manualAlias ?? this.aliasFn(tableName);
            const tableReference = alias ? alias : this.formatTable(tableName);
            return `${tableReference}.<span class="sql-column">${columnName}</span>`;
        }

        generateQuery(query: Query | null): string {
            if (!query) {
                return '';
            }
            return this.produceSql(0, query) + ';';
        }

        private produceSql(level: number, query: Query): string {
            const indent = '    '.repeat(level);
            const nlIndent = '\n' + indent;
            const useColNameWithTable = !!query.leftJoin;

            let result = indent + '<span class="sql-keyword">SELECT</span> ';
            if (!!query.select?.length) {
                result += query.select
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable, select.manualAlias))
                    .join('\n     , ');
                if (query.aggregate) {
                    result += '\n     , <span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                }
            } else {
                if (query.aggregate) {
                    result += '<span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                } else {
                    result += '<span class="sql-star">*</span>';
                }
            }

            result += nlIndent + '<span class="sql-keyword">FROM</span> ' + this.formatTable(query.table, useColNameWithTable);

            if (query.leftJoin) {
                query.leftJoin.forEach(lj => {
                    result += nlIndent + '<span class="sql-keyword">LEFT JOIN</span> ' + this.formatTable(lj.targetTable, true, lj.targetTableAlias)
                        + nlIndent + '  <span class="sql-keyword">ON</span> ' + this.formatColumn(lj.targetTable, lj.targetColumn, true, lj.targetTableAlias)
                        + ' = ' + this.formatColumn(lj.sourceTable, lj.sourceColumn, true, lj.sourceTableAlias);
                    if (lj.joinVariantFilter) {
                        result += nlIndent + '    <span class="sql-keyword">AND</span> ' + lj.joinVariantFilter.replaceAll('$ALIAS', lj.targetTableAlias!);
                    }
                });
            }

            if (query.subqueryFilterColumn) {
                result += nlIndent + '<span class="sql-keyword">WHERE</span> '
                    + this.formatColumn(query.table, query.subqueryFilterColumn, useColNameWithTable)
                    + ' <span class="sql-keyword">IN</span> ('
                    + '\n' + this.produceSql(level + 1, query.sub!)
                    + nlIndent + ')';
            }

            if (query.where) {
                let isAdditionalFilter = !!query.subqueryFilterColumn; // already have a `WHERE`, so continue with `AND`
                query.where.forEach(filter => {
                    if (isAdditionalFilter) {
                        result += nlIndent + '  <span class="sql-keyword">AND</span> ';
                    } else {
                        result += nlIndent + '<span class="sql-keyword">WHERE</span> ';
                    }
                    result += this.formatColumn(filter.table, filter.column, useColNameWithTable)
                        + ' ' + this.sqlTypeHandler.formatFilterForWhereClause(filter);

                    isAdditionalFilter = true;
                });
            }
            if (query.aggregate && !!query.select?.length) {
                result += nlIndent + '<span class="sql-keyword">GROUP BY</span> ' + query.select!
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable))
                    .join('\n       , ');
            }
            return result;
        }
    }
}