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
            const tables = this.queryService.collectSelectedTableAliasPairs();
            const columns: any[] = [];
            tables.forEach(table => {
                for (const col in TableDefinitions.getColumns(table.table)) {
                    columns.push({
                        table: table.table,
                        column: col,
                        manualAlias: table.manualAlias,
                        active: this.queryService.hasColumnSelect(table.table, col, table.manualAlias)
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

            const includeTableName = tables.length > 1;
            const ul = DocElemHelper.newElemWithClass('ul', 'column-select');
            let previousTable = '';
            columns.forEach(col => {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                if (previousTable && previousTable !== col.table) {
                    li.classList.add('separator');
                }
                const tableStyle = TableDefinitions.getStyle(col.table);
                let tablePrefix = '';
                if (includeTableName) {
                    const tableClass = tableStyle.table ?? '';
                    tablePrefix = `<span class="tbl ${tableClass}">${col.table}</span>.`;
                }
                const columnClass = tableStyle[col.column] ?? '';
                li.innerHTML = tablePrefix + `<span class="col ${columnClass}">${col.column}</span>`
                    + (col.manualAlias ? ` (${col.manualAlias})` : '');
                li.dataset.table = col.table;
                li.dataset.column = col.column;
                if (col.manualAlias) {
                    li.dataset.manualAlias = col.manualAlias;
                }
                if (col.active) {
                    li.classList.add('active-column');
                }
                li.addEventListener('click', () => this.toggleColumnActive(li, title));
                ul.append(li);
                previousTable = col.table;
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
                        const manualAlias = column.dataset.manualAlias as string | undefined;
                        query.addColumnSelect(tableTable, columnName, manualAlias);
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
