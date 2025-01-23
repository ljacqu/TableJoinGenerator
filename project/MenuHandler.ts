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
            this.tablesContainer.className = 'menu-initial';

            const listContainer = DocElemHelper.newElemWithClass('div', 'table-list tl-initial');
            for (const table in TableDefinitions.getAllTables()) {
                const btn = document.createElement('button');
                btn.className = 'btn-table' + this.getCustomClassSuffix(table);
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

                listContainer.append(btn);
                listContainer.append(document.createElement('br'));
            }
            this.tablesContainer.append(listContainer);
        }

        /** Lists all columns of the given table to add a filter. Used when an initial table is selected. */
        private showColumnsToFilterInitialTable(table: string, btnElem: HTMLElement): void {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }

            const ul = DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in TableDefinitions.getColumns(table)) {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                const columnClass = TableDefinitions.getStyle(table)[col] ?? '';
                li.innerHTML = `<span class="${columnClass}">${col}</span>`;
                li.addEventListener('click', () => this.createColumnFilterElem(table, col, li, false));
                li.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.queryService.updateQuery(query => {
                        query.selectTable(table);
                        query.addColumnSelect(table, col);
                        this.showRelatedColumns(table);
                        this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList());
                    });
                });
                ul.append(li);
            }

            btnElem.after(ul);
        }

        private showFilterColumnsSubQuery(table: string): void {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }

            const title = DocElemHelper.newElemWithText('h3', `Filter subquery (${table})`);

            const ul = DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in TableDefinitions.getColumns(table)) {
                const li = DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col;
                li.addEventListener('click', () => {
                    this.createColumnFilterElem(table, col, li, true);
                });
                ul.append(li);
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
            TableDefinitions.collectAllReferences(curTable).forEach(reference => {
                references.push({
                    ...reference,
                    reversed: false
                });
            });

            // Check other tables for references targeting the current table
            TableDefinitions.collectReferencesToTable(curTable).forEach(reference => {
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
            this.tablesContainer.className = 'menu-related';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list tl-related');

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
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn)
                    + this.getCustomClassSuffix(ref.targetTable);
                spanWithTableColumn.innerHTML = ` <span class="${cssClass}">${ref.targetTable}</span> (${ref.targetColumn})`;
                li.append(spanWithTableColumn);

                spanWithTableColumn.addEventListener('click', () => {
                    this.onClickReferenceColumn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                spanWithTableColumn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.onClickReferenceColumn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                ul.append(li);
            });
            this.tablesContainer.append(ul);
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
            this.tablesContainer.className = 'menu-left-join';
            const ul = DocElemHelper.newElemWithClass('ul', 'table-list tl-left-join');
            possibleJoins.forEach(ref => {
                const li = document.createElement('li');

                const spanWithTableColumn = DocElemHelper.newElemWithClass('span', 'clicky');
                const targetTableCssClasses = 'rc-target '
                    + this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn)
                    + this.getCustomClassSuffix(ref.targetTable);
                const sourceTableCssClasses = 'rc-source' + this.getCustomClassSuffix(ref.sourceTable);
                const sourceNameAddition = !!ref.sourceTableAlias ? ` (${ref.sourceTableAlias})` : '';
                const targetNameAddition = !!ref.joinVariantName ? ` (${ref.joinVariantName})` : '';
                spanWithTableColumn.innerHTML = ` <b class="${sourceTableCssClasses}">${ref.sourceTable}</b>.${ref.sourceColumn} ${sourceNameAddition}`
                    + ` &rarr; <span class="${targetTableCssClasses}">${ref.targetTable}</span>.${ref.targetColumn} ${targetNameAddition}`;
                li.append(spanWithTableColumn);

                spanWithTableColumn.addEventListener('click', () => {
                    this.onClickLeftJoinColumn(ref);
                });
                spanWithTableColumn.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    this.onClickLeftJoinColumn(ref);
                });
                ul.append(li);
            });
            this.tablesContainer.append(ul);

            const columnElem = this.selectColumnMenu.generateColumnsButtonOrList();
            this.tablesContainer.append(columnElem);
        }

        private mapTableReference(reference: MappedTableReference, tables: Set<string>): QueryLeftJoin[] {
            // Allow to apply a join variant only if the table with the variant is joined in, i.e. the reference was reversed
            const canApplyJoinVariants =
                MenuHandler.isNotNullAndNotEmpty(reference.joinVariants) && reference.reversed;
            const currentLeftJoins = this.queryService.getLeftJoins();

            if (!canApplyJoinVariants) {
                if (tables.has(reference.sourceTable) && tables.has(reference.targetTable)) {
                    return [];
                }

                const sourceTableAliases = new Set<string | undefined>();
                const targetTableAliases = new Set<string | undefined>();
                for (const currentLeftJoin of currentLeftJoins) {
                    if (currentLeftJoin.sourceTable === reference.sourceTable) {
                        sourceTableAliases.add(currentLeftJoin.sourceTableAlias);
                    }
                    if (currentLeftJoin.targetTable === reference.sourceTable) {
                        sourceTableAliases.add(currentLeftJoin.targetTableAlias);
                    }
                    if (currentLeftJoin.sourceTable === reference.targetTable) {
                        targetTableAliases.add(currentLeftJoin.sourceTableAlias);
                    }
                    if (currentLeftJoin.targetTable === reference.targetTable) {
                        targetTableAliases.add(currentLeftJoin.targetTableAlias);
                    }
                }
                MenuHandler.addUndefinedIfEmpty(sourceTableAliases);
                MenuHandler.addUndefinedIfEmpty(targetTableAliases);

                const result: QueryLeftJoin[] = [];
                for (const sourceTableAlias of sourceTableAliases) {
                    for (const targetTableAlias of targetTableAliases) {
                        result.push({
                            sourceTable: reference.sourceTable,
                            sourceColumn: reference.sourceColumn,
                            sourceTableAlias: sourceTableAlias,
                            targetTable: reference.targetTable,
                            targetColumn: reference.targetColumn,
                            targetTableAlias: targetTableAlias
                        });
                    }
                }
                return result;
            }

            // Can apply join variants
            // -----------------------
            // If generic joins already exist for the source and target table, behave like other generic tables and
            // don't offer it as additional join. E.g. for three tables A, B, C, if we have an active left join for
            // A-C and A-B, then we won't offer B-C even though it may exist.
            const tablesOfGenericJoins = new Set<string>();
            currentLeftJoins.filter(lj => !lj.joinVariantName)
                .forEach(lj => {
                    tablesOfGenericJoins.add(lj.sourceTable);
                    tablesOfGenericJoins.add(lj.targetTable);
                });
            if (tablesOfGenericJoins.has(reference.sourceTable) && tablesOfGenericJoins.has(reference.targetTable)) {
                return [];
            }

            const sourceTableAliases = new Set<string | undefined>();
            for (const currentLeftJoin of currentLeftJoins) {
                if (currentLeftJoin.sourceTable === reference.sourceTable) {
                    sourceTableAliases.add(currentLeftJoin.sourceTableAlias);
                }
                if (currentLeftJoin.targetTable === reference.sourceTable) {
                    sourceTableAliases.add(currentLeftJoin.targetTableAlias);
                }
            }
            MenuHandler.addUndefinedIfEmpty(sourceTableAliases);

            const possibleJoins: QueryLeftJoin[] = [];
            reference.joinVariants!.forEach(joinVariant => {
                const variantAlreadyUsed = currentLeftJoins.some(
                    lj => lj.sourceTable === reference.sourceTable
                    && lj.targetTable === reference.targetTable
                    && lj.joinVariantName === joinVariant.name);
                if (!variantAlreadyUsed) {
                    for (const sourceTableAlias of sourceTableAliases) {
                        possibleJoins.push({
                            sourceTable: reference.sourceTable,
                            sourceColumn: reference.sourceColumn,
                            sourceTableAlias: sourceTableAlias,
                            targetTable: reference.targetTable,
                            targetColumn: reference.targetColumn,
                            targetTableAlias: joinVariant.alias,
                            joinVariantName: joinVariant.name,
                            joinVariantFilter: joinVariant.filter
                        });
                    }
                }
            });

            return possibleJoins;
        }

        private static isNotNullAndNotEmpty(arr?: any[]): boolean {
            return !!arr && arr.length > 0;
        }

        private static addUndefinedIfEmpty(set: Set<any | undefined>): void {
            if (set.size === 0) {
                set.add(undefined);
            }
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

        private getCustomClassSuffix(table: string): string {
            const styleDef = TableDefinitions.getStyle(table);
            if (styleDef.table) {
                return ' ' + styleDef.table;
            }
            return '';
        }
    }

    type MappedTableReference = TableReference & {
        reversed: boolean;
    };
}
