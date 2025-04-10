namespace QB {

    export class SelectColumnMenu {

        private isExpanded: boolean = false;

        constructor(private queryService: QueryService,
                    private sqlTypeHandler: SqlTypeHandler) {
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
                const li = document.createElement('li');
                if (previousTable && previousTable !== col.table) {
                    li.classList.add('separator');
                }
                const tableStyle = TableDefinitions.getStyle(col.table);
                let tablePrefix = '';
                if (includeTableName) {
                    const tableClass = tableStyle.table ?? '';
                    tablePrefix = `<span class="tbl ${tableClass}">${col.table}</span>.`;
                }

                const filterButton = DocElemHelper.newElemWithClass('button', 'filter');
                filterButton.innerText = '🜄';
                this.updateFilterButtonClasses(filterButton, col.table, col.column, col.manualAlias);
                filterButton.title = 'Edit filters';
                filterButton.addEventListener('click', () => {
                    const isAlreadyOpen = li.querySelector('ul') !== null;
                    this.deleteAllWhereInputElements();
                    if (isAlreadyOpen) {
                        return;
                    }
                    this.createFiltersSublist(li, col.table, col.column, col.manualAlias);
                });

                const spanColumnWrapper = DocElemHelper.newElemWithClass('span', 'clicky');
                const columnClass = tableStyle[col.column] ?? '';
                spanColumnWrapper.innerHTML = tablePrefix + `<span class="col ${columnClass}">${col.column}</span>`
                    + (col.manualAlias ? ` (${col.manualAlias})` : '');
                li.dataset.table = col.table;
                li.dataset.column = col.column;
                if (col.manualAlias) {
                    li.dataset.manualAlias = col.manualAlias;
                }
                if (col.active) {
                    li.classList.add('active-column');
                }
                li.append(filterButton, document.createTextNode(' '), spanColumnWrapper);
                spanColumnWrapper.addEventListener('click', () => this.toggleColumnActive(li, title));
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

        deleteAllWhereInputElements(): void {
            for (const elem of document.querySelectorAll('.where_input')) {
                elem.remove();
            }
        }

        createColumnFilterElem(colElem: HTMLElement, processFilterValueFn: (value: string) => void): void {
            const inputElem = DocElemHelper.newElemWithClass('input', 'where_input') as HTMLInputElement;
            inputElem.type = 'text';
            inputElem.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    processFilterValueFn(inputElem.value);
                }
            });
            colElem.after(inputElem);

            const addBtn = DocElemHelper.newElemWithClass('button', 'where_input');
            addBtn.innerText = 'Add';
            addBtn.addEventListener('click', () => {
                processFilterValueFn(inputElem.value);
            });
            inputElem.after(addBtn);
        }

        private createFiltersSublist(colElem: HTMLLIElement, table: string, column: string, tableAlias?: string): void {
            const ulElem = DocElemHelper.newElemWithClass('ul', 'where_input');
            const filters = this.queryService.getFilters(table, column, tableAlias);
            filters.forEach(filter => {
                const li = document.createElement('li');

                const input = document.createElement('input');
                input.type = 'text';
                input.value = filter.inputValue ?? filter.value;

                const saveBtn = DocElemHelper.newElemWithText('button', 'Save') as HTMLButtonElement;
                saveBtn.addEventListener('click', () => {
                    const newFilter = this.sqlTypeHandler.validateColumnFilterElemOrAlertError(
                        table, column, input.value, tableAlias);

                    if (newFilter) {
                        this.queryService.updateQuery(query => {
                            query.replaceFilter(filter, newFilter);
                        });
                        this.updateFiltersListAfterAction(colElem, table, column, tableAlias);
                    }
                });
                const delBtn = DocElemHelper.newElemWithText('button', 'Del');
                delBtn.addEventListener('click', () => {
                    this.queryService.updateQuery(query => {
                        query.removeFilter(filter);
                    });
                    this.updateFiltersListAfterAction(colElem, table, column, tableAlias);
                });

                if (filter.type === ColumnFilterType.NULL_FILTER) {
                    input.disabled = true;
                    input.value = (filter.value ? 'NOT NULL' : 'NULL');
                    saveBtn.disabled = true;
                }

                input.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        saveBtn.click();
                    }
                });

                li.append(input, saveBtn, delBtn);
                ulElem.append(li);
            });

            // New filter
            const li = document.createElement('li');
            const span = document.createElement('span');
            li.append(span);

            this.createColumnFilterElem(span, value => {
                const filter = this.sqlTypeHandler.validateColumnFilterElemOrAlertError(
                    table, column, value, tableAlias);

                if (filter !== null) {
                    this.queryService.updateQuery(query => {
                        query.addFilter(filter);
                    });
                    this.updateFiltersListAfterAction(colElem, table, column, tableAlias);
                }
            });
            ulElem.append(li);
            colElem.append(ulElem);
        }

        /**
         * Reconstructs all filter inputs of a given column. `colElem` is the `<li>` item of the
         * parent list, namely the list item for the column for which the filters are being added.
         */
        private updateFiltersListAfterAction(colElem: HTMLLIElement, table: string, column: string,
                                             tableAlias?: string): void {
            this.deleteAllWhereInputElements();
            this.createFiltersSublist(colElem, table, column, tableAlias);
            const filterButton = colElem.querySelector('button.filter');
            if (filterButton) { // should always exist
                this.updateFilterButtonClasses(filterButton, table, column, tableAlias);
            }
        }

        private updateFilterButtonClasses(filterElem: Element, table: string, column: string,
                                          tableAlias?: string): void {
            const hasFilters = this.queryService.hasFilterOnColumn(table, column, tableAlias);
            if (hasFilters) {
                filterElem.classList.add('filter-has-entries');
            } else {
                filterElem.classList.remove('filter-has-entries');
            }
        }
    }
}
