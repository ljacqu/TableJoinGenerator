namespace QB {

    export class MenuHandler {

        constructor(private tablesContainer: HTMLElement,
                    private aggregateButton: AggregateButton,
                    private queryService: QueryService,
                    private sqlTypeHandler: SqlTypeHandler,
                    private selectColumnMenu: SelectColumnMenu) {
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
                        this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList(true));
                    });
                });

                this.tablesContainer.appendChild(btn);
                this.tablesContainer.appendChild(document.createElement('br'));
            }
        }

        /** Lists all columns of the given table to add a filter. Used when an initial table is selected. */
        private showColumnsToFilterInitialTable(table: string, btnElem: HTMLElement): void {
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

        private showFilterColumnsSubQuery(table: string): void {
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

        private createColumnFilterElem(table: string, column: string, colElem: HTMLElement, forSubQuery: boolean): void {
            for (const elem of document.querySelectorAll('.where_input')) {
                elem.remove();
            }

            const inputElem = DocElemHelper.newElemWithClass('input', 'where_input') as HTMLInputElement;
            inputElem.type = 'text';

            const onSubmitFilter = () => {
                try {
                    this.sqlTypeHandler.validateColumnFilterElem(table, column, inputElem.value);
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
                    this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList(!forSubQuery));
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

        // Defines the CSS class name(s) when a related column is shown. You can override this function to show all
        // columns the same or to have custom behavior, e.g. to check for past (table, column) combinations and not just
        // past tables as is currently implemented.
        private getClassForRelatedColumn(table: string, column: string): string {
            for (const pastColumn of this.queryService.getPastColumns()) {
                if (pastColumn.table === table) {
                    return 'rc-past';
                }
            }
            return 'rc-new';
        }

        private collectRelatedColumns(curTable: string): MappedTableReference[] {
            const references: MappedTableReference[] = [];

            // Add references from the current table
            QB.TableDefinitions.collectAllReferences(curTable).forEach(reference => {
                references.push({
                    ...reference,
                    reversed: false
                });
            });

            // Check other tables for references targeting the current table
            QB.TableDefinitions.collectReferencesToTable(curTable).forEach(reference => {
                references.push({
                    sourceTable: reference.targetTable,
                    sourceColumn: reference.targetColumn,
                    targetTable: reference.sourceTable,
                    targetColumn: reference.sourceColumn,
                    joinVariants: reference.joinVariants,
                    reversed: true
                });
            });

            return references;
        }

        /** Shows all (table, column) pairs that can be referenced from the current table. */
        private showRelatedColumns(curTable: string): void {
            const references = this.collectRelatedColumns(curTable);
            this.aggregateButton.show();

            this.tablesContainer.innerHTML = '<h3>Join/subquery table</h3>';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);

            references.forEach(ref => {
                const li = document.createElement('li');

                const btnLeftJoin = DocElemHelper.newElemWithText('button', '⟕');
                btnLeftJoin.title = 'Left join';
                btnLeftJoin.addEventListener('click', () => {
                    const reference = {
                        sourceTable: curTable,
                        sourceColumn: ref.sourceColumn,
                        targetTable: ref.targetTable,
                        targetColumn: ref.targetColumn
                    };
                    this.onClickLeftJoinColumn(reference);
                });
                li.append(btnLeftJoin);

                if (this.queryService.showWhereQueryInButton()) {
                    const btnWhereIn = DocElemHelper.newElemWithText('button', '⊆');
                    btnWhereIn.title = 'keep current table, filter by this table';
                    btnWhereIn.addEventListener('click', () => {
                        this.onClickWhereIn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                    });
                    li.append(btnWhereIn);
                }

                const spanWithTableColumn = DocElemHelper.newElemWithClass('span', 'clicky');
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn);
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

        private showLeftJoinColumns(): void {
            const tables = this.queryService.collectTopLevelTables();
            this.aggregateButton.show();

            const references: MappedTableReference[] = [];
            tables.forEach(activeTable => {
                references.push(...this.collectRelatedColumns(activeTable));
            });

            const possibleJoins: QueryLeftJoin[] = [];
            for (const reference of references) {
                possibleJoins.push(...this.mapTableReference(reference, tables));
            }

            this.tablesContainer.innerHTML = '<h3>Left join</h3>';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);
            possibleJoins.forEach(ref => {
                const li = document.createElement('li');

                const spanWithTableColumn = DocElemHelper.newElemWithClass('span', 'clicky');
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn);
                const nameAddition = !!ref.joinVariant ? ` (${ref.joinVariant.name})` : '';
                spanWithTableColumn.innerHTML = ` <b>${ref.sourceTable}</b>.${ref.sourceColumn} &rarr; <span class="${cssClass}">${ref.targetTable}</span>.${ref.targetColumn} ${nameAddition}`;
                li.append(spanWithTableColumn);

                spanWithTableColumn.addEventListener('click', () => {
                    this.onClickLeftJoinColumn(ref);
                });
                spanWithTableColumn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.onClickLeftJoinColumn(ref);
                });
                ul.appendChild(li);
            });

            const columnElem = this.selectColumnMenu.generateColumnsButtonOrList();
            this.tablesContainer.append(columnElem);
        }

        private mapTableReference(reference: MappedTableReference,
                                  tables: Set<string>): QueryLeftJoin[] {
            // Allow to apply a join variant only if the table with the variant is joined in, i.e. it was reversed
            const canApplyJoinVariants =
                MenuHandler.isNotNullAndNotEmpty(reference.joinVariants) && reference.reversed;
            if (!canApplyJoinVariants) {
                if (tables.has(reference.sourceTable) && tables.has(reference.targetTable)) {
                    return [];
                }
                return [
                    {
                        sourceTable: reference.sourceTable,
                        sourceColumn: reference.sourceColumn,
                        targetTable: reference.targetTable,
                        targetColumn: reference.targetColumn
                    }
                ];
            }

            // Can apply join variants
            const currentLeftJoins = this.queryService.getLeftJoins();
            const possibleJoins: QueryLeftJoin[] = [];
            // TODO: if we have a generic 'join', need to filter it out as soon as there is a join variant
            reference.joinVariants!.forEach(joinVariant => {
                const variantAlreadyUsed = currentLeftJoins.some(
                    lj => lj.sourceTable === reference.sourceTable
                    && lj.targetTable === reference.targetTable
                    && lj.joinVariant?.name === joinVariant.name);
                if (!variantAlreadyUsed) {
                    possibleJoins.push({
                        sourceTable: reference.sourceTable,
                        sourceColumn: reference.sourceColumn,
                        targetTable: reference.targetTable,
                        targetColumn: reference.targetColumn,
                        joinVariant: joinVariant
                    });
                }
            });

            return possibleJoins;
        }

        private static isNotNullAndNotEmpty(arr?: any[]): boolean {
            return !!arr && arr.length > 0;
        }

        private onClickLeftJoinColumn(tableJoin: QueryLeftJoin) {
            this.queryService.updateQuery(query => {
                query.addLeftJoin(tableJoin);
                this.showLeftJoinColumns();
            });
        }

        /**
         * Click handler of a "related column" that is shown after an initial table has been selected.
         *
         * Changes the current query to a subquery filtering the given (parentTable, parentColumn), so that the new
         * query is: <code>SELECT * FROM parentTable WHERE parentColumn IN (SELECT sourceColumn FROM {query})</code>.
         */
        private onClickReferenceColumn(sourceColumn: string, parentTable: string, parentColumn: string): void {
            this.queryService.updateQuery(query => {
                query.addSuperQuery(sourceColumn, parentTable, parentColumn);

                this.aggregateButton.turnOff();
                this.showRelatedColumns(parentTable);
                // query level is "reset", so hide columns again
                this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList(true));
            });
        }

        /**
         * Click handler for the "where query in ..." button (⊆).
         *
         * Adds a subquery to the current query such that the new query becomes:
         * <code>{query} WHERE sourceColumn IN (SELECT subqueryColumn FROM subqueryTable)</code>.
         */
        private onClickWhereIn(sourceColumn: string, subqueryTable: string, subqueryColumn: string): void {
            this.queryService.updateQuery(query => {
                query.addSubQuery(sourceColumn, subqueryTable, subqueryColumn);

                this.showRelatedColumns(query.getCurrentSelectedTable());
                this.showFilterColumnsSubQuery(subqueryTable);
                this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList());
            });
        }
    }

    type MappedTableReference = TableReference & {
        reversed: boolean;
    };
}
