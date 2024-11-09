namespace QB {

    export class TableDefinitions {

        private static tables?: any;

        private constructor() {
        }

        static init(__tables: any) {
            this.tables = __tables;
        }

        static getColumnType(table: string, column: string): string {
            return this.tables[table].columns[column];
        }
    }

}