namespace QB {

    export class TableDefinitions {

        private static tables: TableDefs;

        private constructor() {
        }

        static init(__tables: any) {
            this.tables = __tables as TableDefs;
        }

        static getColumnType(table: string, column: string): string {
            return this.tables![table].columns[column];
        }

        static getColumns(table: string): ColumnDef {
            return this.tables[table].columns;
        }

        static getReferences(table: string): TableReference {
            return this.tables[table].references;
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
        references: TableReference;
        highlights: { };
    };

    export type TableReference = {
        [columnName: string]: {
            table: string;
            column: string;
        }
    };

    export type ColumnDef = {
        [columnName: string]: string
    };
}
