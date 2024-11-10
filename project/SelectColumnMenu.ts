namespace QB {

    export class SelectColumnMenu {

        private isExpanded: boolean = false;

        constructor(private queryService: QueryService) {
        }

        generateColumnsButtonOrList(forceShowButton?: boolean): HTMLElement {
            if (!this.isExpanded || forceShowButton) {
                this.isExpanded = false;
                const columnsButton = DocElemHelper.newElemWithText('button', 'Select columns');
                columnsButton.addEventListener('click', () => {
                    this.isExpanded = true;
                    columnsButton.parentElement!.append(this.createListElementWithSelectableColumns());
                    columnsButton.remove();
                });
                return columnsButton;
            }

            return this.createListElementWithSelectableColumns();
        }

        private createListElementWithSelectableColumns() {
            const tables = this.queryService.collectTopLevelTables();
            const columns: any[] = [];
            tables.forEach(table => {
                for (const col in QB.TableDefinitions.getColumns(table)) {
                    columns.push({
                        table: table,
                        column: col,
                        active: this.queryService.hasColumnSelect(table, col)
                    });
                }
            });

            const title = DocElemHelper.newElemWithText('h3', 'Select columns');
            const ul = document.createElement('ul');
            columns.forEach(col => {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col.table + '.' + col.column;
                li.dataset.table = col.table;
                li.dataset.column = col.column;
                if (col.active) {
                    li.classList.add('active-column');
                }
                li.addEventListener('click', () => {
                    if (li.classList.contains('active-column')) {
                        li.classList.remove('active-column');
                    } else {
                        li.classList.add('active-column');
                    }

                    this.queryService.updateQuery(query => {
                        query.clearColumnSelects();
                        for (const column of ul.children) {
                            if (column instanceof HTMLElement && column.classList.contains('active-column')) {
                                const tableTable = column.dataset.table as string;
                                const columnName = column.dataset.column as string;
                                query.addColumnSelect(tableTable, columnName);
                            }
                        }
                    });
                });
                ul.append(li);
            });

            const div = document.createElement('div');
            div.append(title);
            div.append(ul);
            return div;
        }
    }
}
