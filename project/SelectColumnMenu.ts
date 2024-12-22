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

            const div = document.createElement('div');
            const title = DocElemHelper.newElemWithClass('h3', 'clicky');
            title.innerText = 'Select columns';
            title.addEventListener('click', () => {
                if (!this.queryService.hasAnyColumnSelect()) {
                    this.isExpanded = false;
                    div.parentElement!.append(this.generateColumnsButtonOrList());
                    div.remove();
                }
            });

            const ul = document.createElement('ul');
            columns.forEach(col => {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col.table + '.' + col.column;
                li.dataset.table = col.table;
                li.dataset.column = col.column;
                if (col.active) {
                    li.classList.add('active-column');
                }
                li.addEventListener('click', () => this.toggleColumnActive(li, title));
                ul.append(li);
            });

            div.append(title);
            div.append(ul);
            return div;
        }

        private toggleColumnActive(li: HTMLElement, title: HTMLElement): void {
            if (li.classList.contains('active-column')) {
                li.classList.remove('active-column');
            } else {
                li.classList.add('active-column');
            }

            this.queryService.updateQuery(query => {
                query.clearColumnSelects();
                for (const column of li.parentElement!.children) {
                    if (column instanceof HTMLElement && column.classList.contains('active-column')) {
                        const tableTable = column.dataset.table as string;
                        const columnName = column.dataset.column as string;
                        query.addColumnSelect(tableTable, columnName);
                    }
                }

                // If no more columns are selected, style the title as clickable because the columns list can be hidden
                // If columns have been selected, the list cannot be hidden, so don't show the title as clickable
                if (this.queryService.hasAnyColumnSelect()) {
                    title.classList.remove('clicky');
                } else {
                    title.classList.add('clicky');
                }
            });
        }
    }
}
