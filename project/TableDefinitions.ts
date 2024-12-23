namespace QB {

    export class TableDefinitions {

        private static tables: TableDefs;

        private constructor() {
        }

        static init(__tables: any) {
            this.tables = __tables as TableDefs;
        }

        static getColumnType(table: string, column: string): string {
            return this.tables[table].columns[column];
        }

        static getColumns(table: string): ColumnDef {
            return this.tables[table].columns;
        }

        static collectAllReferences(table: string): TableReference[] {
            const result: TableReference[] = [];
            Object.entries(this.tables[table].references).forEach(([sourceColumn, references]) => {
                references.forEach(reference => {
                    result.push({
                        sourceTable: table,
                        sourceColumn: sourceColumn,
                        targetTable: reference.table,
                        targetColumn: reference.column,
                        joinVariants: reference.joinVariants
                    });
                });
            });
            return result;
        }

        static collectReferencesToTable(curTable: string): TableReference[] {
            const result: TableReference[] = [];
            for (const table in this.tables) {
                if (table !== curTable) {
                    Object.entries(this.tables[table].references).forEach(([sourceColumn, references]) => {
                        references.forEach(reference => {
                            if (reference.table === curTable) {
                                result.push({
                                    sourceTable: table,
                                    sourceColumn: sourceColumn,
                                    targetTable: curTable,
                                    targetColumn: reference.column,
                                    joinVariants: reference.joinVariants
                                });
                            }
                        });
                    });
                }
            }
            return result;
        }

        static getAllTables(): TableDefs {
            return this.tables;
        }
    }

    type TableDefs = {
        [tableName: string]: TableDef
    };

    export type TableDef = {
        alias?: string;
        columns: ColumnDef;
        references: TableReferencesHolder;
        highlights: { };
    };

    export type TableReferencesHolder = {
        [columnName: string]: {
            table: string;
            column: string;
            joinVariants?: TableReferenceJoinVariant[];
        }[]
    };

    export type TableReferenceJoinVariant = {
        name: string;
        alias: string;
        filter: string;
    };

    export type TableReference = {
        sourceTable:  string;
        sourceColumn: string;
        targetTable:  string;
        targetColumn: string;
        joinVariants?: TableReferenceJoinVariant[];
    };

    export type ColumnDef = {
        [columnName: string]: string
    };
}
