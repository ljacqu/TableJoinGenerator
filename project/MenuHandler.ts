namespace QB {

    export class MenuHandler {

        constructor(private tablesContainer: HTMLElement,
                    private queryService: QueryService,
                    private aggregateButton: AggregateButton) {
        }

        /** Lists all tables, on click shows the table's columns for filtering. */
        showInitialTables(): void {
            this.aggregateButton.hide();
            this.queryService.updateQuery(query => {
                query.clearState();
            });

            this.tablesContainer.innerHTML = '<h3>Tables</h3>';

            for (const table in QB.TableDefinitions.getAllTables()) {
                const btn = DocElemHelper.newElemWithClass('button', 'btn-table');
                btn.innerText = table;

                btn.addEventListener('click', () => {
                    const btnSibling = DocElemHelper.getNextElemSibling(btn);
                    if (btnSibling.tagName === 'UL') {
                        btnSibling.remove();
                    } else {
                        this.showColumnsToFilterInitialTable(table, btn);
                    }
                });
                btn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.queryService.updateQuery(query => {
                        query.selectTable(table);
                        this.showRelatedColumns(table);
                        this.renderSelectColumnButtonOrColumns(true);
                    });
                });

                this.tablesContainer.appendChild(btn);
                this.tablesContainer.appendChild(document.createElement('br'));
            }
        }

        /** Lists all columns of the given table to add a filter. Used when an initial table is selected. */
        showColumnsToFilterInitialTable(table: string, btnElem: HTMLElement): void {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }

            const ul = DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in QB.TableDefinitions.getColumns(table)) {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col;
                li.addEventListener('click', () => this.createColumnFilterElem(table, col, li, false));
                ul.appendChild(li);
            }

            btnElem.after(ul);
        }

        showFilterColumnsSubQuery(table: string): void {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }

            const title = DocElemHelper.newElemWithText('h3', `Filter subquery (${table})`);

            const ul = DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in QB.TableDefinitions.getColumns(table)) {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col;
                li.addEventListener('click', () => {
                    this.createColumnFilterElem(table, col, li, true);
                });
                ul.appendChild(li);
            }

            this.tablesContainer.append(title);
            this.tablesContainer.append(ul);
        }

        createColumnFilterElem(table: string, column: string, colElem: HTMLElement, forSubQuery: boolean): void {
            for (const elem of document.querySelectorAll('.where_input')) {
                elem.remove();
            }

            const inputElem = DocElemHelper.newElemWithClass('input', 'where_input') as HTMLInputElement;
            inputElem.type = 'text';

            const onSubmitFilter = () => {
                try {
                    this.validateColumnFilterElem(table, column, inputElem.value);
                } catch (e: any) {
                    window.alert(e.message);
                    return;
                }

                this.queryService.updateQuery(query => {
                    if (forSubQuery) {
                        query.addFilterToSubQuery(column, inputElem.value);
                    } else {
                        query.selectTableWithFilter(table, column, inputElem.value);
                    }

                    this.showRelatedColumns(forSubQuery ? query.getCurrentSelectedTable() : table);
                    this.renderSelectColumnButtonOrColumns(!forSubQuery);
                });
            };

            inputElem.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    onSubmitFilter();
                }
            });
            colElem.after(inputElem);

            const okBtn = DocElemHelper.newElemWithClass('button', 'where_input');
            okBtn.innerText = 'Go';
            okBtn.addEventListener('click', () => {
                onSubmitFilter();
            });
            inputElem.after(okBtn);
        }

        validateColumnFilterElem(table: string, column: string, value: string | null): void {
            let columnType = QB.TableDefinitions.getColumnType(table, column);
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
                    break;
                case 'varchar':
                case 'varchar2':
                case 'timestamp':
                case 'datetime':
                case 'blob':
                case 'clob':
                    break;
                default:
                    console.log(`Unhandled validation for ${columnType}`);
            }
        }

        // Defines the CSS class name(s) when a related column is shown. You can override this function to show all
        // columns the same or to have custom behavior, e.g. to check for past (table, column) combinations and not just
        // past tables as is currently implemented.
        getClassForRelatedColumn(table: string, column: string, prevCol: Column | null): string {
            if (prevCol && prevCol.table === table && prevCol.column === column) {
                return 'rc-prev';
            }
            for (const pastColumn of this.queryService.getPastColumns()) {
                if (pastColumn.table === table) {
                    return 'rc-past';
                }
            }
            return 'rc-new';
        }

        collectRelatedColumns(curTable: string): QueryLeftJoin[] {
            const references: QueryLeftJoin[] = [];

            // Add references from the current table
            Object.entries(QB.TableDefinitions.getReferences(curTable)).forEach(([sourceColumn, reference]) => {
                references.push({
                    sourceTable: curTable,
                    sourceColumn: sourceColumn,
                    targetTable: reference.table,
                    targetColumn: reference.column
                });
            });

            // Check other tables for references targeting the current table
            Object.entries(QB.TableDefinitions.getAllTables()).forEach(([table, definition]) => {
                if (table !== curTable) {
                    Object.entries(definition.references).forEach(([targetColumn, reference]) => {
                        if (reference.table === curTable) {
                            references.push({
                                sourceTable: curTable,
                                sourceColumn: reference.column,
                                targetTable: table,
                                targetColumn: targetColumn
                            });
                        }
                    });
                }
            });

            return references;
        }

        /** Shows all (table, column) pairs that can be referenced from the current table. */
        showRelatedColumns(curTable: string): void {
            const references = this.collectRelatedColumns(curTable);
            this.aggregateButton.show();

            const prevCol = this.queryService.getPreviousColumn();

            this.tablesContainer.innerHTML = '<h3>Join/subquery table</h3>';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);

            references.forEach(ref => {
                const li = document.createElement('li');

                if (this.queryService.showWhereQueryInButton()) {
                    const btnWhereIn = DocElemHelper.newElemWithText('button', '⊆');
                    btnWhereIn.title = 'keep current table, filter by this table';
                    btnWhereIn.addEventListener('click', () => {
                        this.onClickWhereIn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                    });
                    li.append(btnWhereIn);
                }

                const btnLeftJoin = DocElemHelper.newElemWithText('button', '⟕');
                btnLeftJoin.title = 'Left join';
                btnLeftJoin.addEventListener('click', () => {
                    this.onClickLeftJoinColumn(curTable, ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                li.append(btnLeftJoin);

                const spanWithTableColumn = DocElemHelper.newElemWithClass('span', 'clicky');
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn, prevCol);
                spanWithTableColumn.innerHTML = ` <span class="${cssClass}">${ref.targetTable}</span> (${ref.targetColumn})`;
                li.append(spanWithTableColumn);

                spanWithTableColumn.addEventListener('click', () => {
                    this.onClickReferenceColumn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                spanWithTableColumn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.onClickReferenceColumn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                ul.appendChild(li);
            });
        }

        showLeftJoinColumns(isFirstLeftJoin: boolean): void {
            const tables = this.queryService.collectTopLevelTables();
            this.aggregateButton.show();

            let references: QueryLeftJoin[] = [];
            tables.forEach(activeTable => {
                references.push(...this.collectRelatedColumns(activeTable));
            });
            references = references.filter(ref => !tables.has(ref.sourceTable) || !tables.has(ref.targetTable));

            const showColumnsButton = isFirstLeftJoin || !!document.getElementById('select-col-btn');
            this.tablesContainer.innerHTML = '<h3>Left join</h3>';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);
            references.forEach(ref => {
                const li = document.createElement('li');

                const spanWithTableColumn = DocElemHelper.newElemWithClass('span', 'clicky');
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn, null);
                spanWithTableColumn.innerHTML = ` <b>${ref.sourceTable}</b>.${ref.sourceColumn} &rarr; <span class="${cssClass}">${ref.targetTable}</span>.${ref.targetColumn} `;
                li.append(spanWithTableColumn);

                spanWithTableColumn.addEventListener('click', () => {
                    this.onClickLeftJoinColumn(ref.sourceTable, ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                spanWithTableColumn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.onClickLeftJoinColumn(ref.sourceTable, ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                ul.appendChild(li);
            });

            this.renderSelectColumnButtonOrColumns(showColumnsButton);
        }

        renderSelectColumnButtonOrColumns(showColumnsButton: boolean): void {
            if (showColumnsButton) {
                const columnsButton = DocElemHelper.newElemWithText('button', 'Select columns');
                columnsButton.id = 'select-col-btn';
                columnsButton.addEventListener('click', () => {
                    this.tablesContainer.append(this.createListElementWithSelectableColumns());
                    columnsButton.remove();
                });
                this.tablesContainer.append(columnsButton);
            } else {
                this.tablesContainer.append(this.createListElementWithSelectableColumns());
            }
        }

        // When in 'left join' mode, offer to select only some columns
        createListElementWithSelectableColumns() {
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

        onClickLeftJoinColumn(sourceTable: string, sourceColumn: string,
                              targetTable: string, targetColumn: string): void {
            this.queryService.updateQuery(query => {
                const isFirstLeftJoin = query.hasLeftJoin();
                query.addLeftJoin(sourceTable, sourceColumn, targetTable, targetColumn);
                this.showLeftJoinColumns(isFirstLeftJoin);
            });
        }

        /** Changes the current query to a subquery filtering the given (targetTable, targetColumn). */
        onClickReferenceColumn(sourceColumn: string, targetTable: string, targetColumn: string): void {
            this.queryService.updateQuery(query => {
                query.addSuperQuery(sourceColumn, targetTable, targetColumn);

                this.aggregateButton.turnOff();
                this.showRelatedColumns(targetTable);
                this.renderSelectColumnButtonOrColumns(true); // query level is "reset", so hide columns again
            });
        }

        // TODO: Revise function names (child/sub would be clearer)
        onClickWhereIn(sourceColumn: string, targetTable: string, targetColumn: string): void {
            this.queryService.updateQuery(query => {
                query.addSubQuery(sourceColumn, targetTable, targetColumn);

                const hasSelectColumnsButton = !!document.getElementById('select-col-btn');
                this.showRelatedColumns(query.getCurrentSelectedTable());
                this.showFilterColumnsSubQuery(targetTable);
                this.renderSelectColumnButtonOrColumns(hasSelectColumnsButton);
            });
        }
    }
}
