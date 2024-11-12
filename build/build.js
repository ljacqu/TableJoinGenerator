"use strict";
var QB;
(function (QB) {
    class AggregateButton {
        constructor(buttonElement) {
            this.buttonElement = buttonElement;
        }
        hide() {
            this.buttonElement.style.display = 'none';
            this.turnOff();
        }
        show() {
            this.buttonElement.style.display = 'inline-block';
        }
        turnOff() {
            this.buttonElement.classList.remove('btn-active');
        }
        toggle() {
            if (this.buttonElement.classList.contains('btn-active')) {
                this.buttonElement.classList.remove('btn-active');
                return false;
            }
            else {
                this.buttonElement.classList.add('btn-active');
                return true;
            }
        }
        initializeOnClickHandler(onClickFunction) {
            this.buttonElement.addEventListener('click', onClickFunction);
        }
    }
    QB.AggregateButton = AggregateButton;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class DocElemHelper {
        constructor() {
        }
        static getElementById(id) {
            const elem = document.getElementById(id);
            if (!elem) {
                throw new Error(`Failed to retrieve element with ID "${id}"`);
            }
            return elem;
        }
        static getNextElemSibling(elem) {
            const nextSib = elem.nextElementSibling;
            if (!nextSib) {
                throw new Error('Element "' + elem + '" unexpectedly had no siblings');
            }
            return nextSib;
        }
        static newElemWithClass(tagName, cssClassName) {
            const elem = document.createElement(tagName);
            elem.classList.add(cssClassName);
            return elem;
        }
        static newElemWithText(tagName, innerText) {
            const elem = document.createElement(tagName);
            elem.innerText = innerText;
            return elem;
        }
    }
    QB.DocElemHelper = DocElemHelper;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class Formatter {
        constructor(sqlTypeHandler, aliasFn, schema) {
            this.sqlTypeHandler = sqlTypeHandler;
            this.aliasFn = aliasFn;
            this.schema = schema;
        }
        formatTable(tableName, includeAlias = false) {
            const tableReference = this.schema ? `${this.schema}.${tableName}` : tableName;
            if (includeAlias) {
                const alias = this.aliasFn(tableName);
                if (alias) {
                    return tableReference + ' ' + alias;
                }
            }
            return tableReference;
        }
        formatColumn(tableName, columnName, useColNameWithTable = false) {
            if (!useColNameWithTable) {
                return `<span class="sql-column">${columnName}</span>`;
            }
            const alias = this.aliasFn(tableName);
            const tableReference = alias ? alias : this.formatTable(tableName);
            return `${tableReference}.<span class="sql-column">${columnName}</span>`;
        }
        generateQuery(query) {
            if (!query) {
                return '';
            }
            return this.produceSql(0, query) + ';';
        }
        produceSql(level, query) {
            const indent = '    '.repeat(level);
            const nlIndent = '\n' + indent;
            const useColNameWithTable = !!query.leftJoin;
            let result = indent + '<span class="sql-keyword">SELECT</span> ';
            if (!!query.select?.length) {
                result += query.select
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable))
                    .join('\n     , ');
                if (query.aggregate) {
                    result += '\n     , <span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                }
            }
            else {
                if (query.aggregate) {
                    result += '<span class="sql-keyword">COUNT(<span class="sql-number">1</span>) AS <span class="sql-text">total</span></span>';
                }
                else {
                    result += '<span class="sql-star">*</span>';
                }
            }
            result += nlIndent + '<span class="sql-keyword">FROM</span> ' + this.formatTable(query.table, useColNameWithTable);
            if (query.leftJoin) {
                query.leftJoin.forEach(lj => {
                    result += nlIndent + '<span class="sql-keyword">LEFT JOIN</span> ' + this.formatTable(lj.targetTable, true)
                        + nlIndent + '  <span class="sql-keyword">ON</span> ' + this.formatColumn(lj.targetTable, lj.targetColumn, true)
                        + ' = ' + this.formatColumn(lj.sourceTable, lj.sourceColumn, true);
                });
            }
            if (query.subqueryFilterColumn) {
                result += nlIndent + '<span class="sql-keyword">WHERE</span> '
                    + this.formatColumn(query.table, query.subqueryFilterColumn, useColNameWithTable)
                    + ' <span class="sql-keyword">IN</span> ('
                    + '\n' + this.produceSql(level + 1, query.sub)
                    + nlIndent + ')';
            }
            if (query.where) {
                if (query.subqueryFilterColumn) { // already have a `WHERE`, now need an `AND`
                    result += nlIndent + '  <span class="sql-keyword">AND</span> ';
                }
                else {
                    result += nlIndent + '<span class="sql-keyword">WHERE</span> ';
                }
                result += this.formatColumn(query.table, query.where.column, useColNameWithTable);
                if (!query.where.filter) {
                    result += ' <span class="sql-keyword">IS NULL</span>';
                }
                else if (query.where.filter === '!') {
                    result += ' <span class="sql-keyword">IS NOT NULL</span>';
                }
                else {
                    result += ' = ' + this.sqlTypeHandler.formatValueForWhereClause(query.where.filter, query.table, query.where.column);
                }
            }
            if (query.aggregate && !!query.select?.length) {
                result += nlIndent + '<span class="sql-keyword">GROUP BY</span> ' + query.select
                    .map(select => this.formatColumn(select.table, select.column, useColNameWithTable))
                    .join('\n       , ');
            }
            return result;
        }
    }
    QB.Formatter = Formatter;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class MenuHandler {
        constructor(tablesContainer, aggregateButton, queryService, sqlTypeHandler, selectColumnMenu) {
            this.tablesContainer = tablesContainer;
            this.aggregateButton = aggregateButton;
            this.queryService = queryService;
            this.sqlTypeHandler = sqlTypeHandler;
            this.selectColumnMenu = selectColumnMenu;
        }
        /** Lists all tables, on click shows the table's columns for filtering. */
        showInitialTables() {
            this.aggregateButton.hide();
            this.queryService.updateQuery(query => {
                query.clearState();
            });
            this.tablesContainer.innerHTML = '<h3>Tables</h3>';
            for (const table in QB.TableDefinitions.getAllTables()) {
                const btn = QB.DocElemHelper.newElemWithClass('button', 'btn-table');
                btn.innerText = table;
                btn.addEventListener('click', () => {
                    const btnSibling = QB.DocElemHelper.getNextElemSibling(btn);
                    if (btnSibling.tagName === 'UL') {
                        btnSibling.remove();
                    }
                    else {
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
        showColumnsToFilterInitialTable(table, btnElem) {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }
            const ul = QB.DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in QB.TableDefinitions.getColumns(table)) {
                const li = QB.DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col;
                li.addEventListener('click', () => this.createColumnFilterElem(table, col, li, false));
                ul.appendChild(li);
            }
            btnElem.after(ul);
        }
        showFilterColumnsSubQuery(table) {
            for (const elem of document.querySelectorAll('ul.columns')) {
                elem.remove();
            }
            const title = QB.DocElemHelper.newElemWithText('h3', `Filter subquery (${table})`);
            const ul = QB.DocElemHelper.newElemWithClass('ul', 'columns');
            for (const col in QB.TableDefinitions.getColumns(table)) {
                const li = QB.DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col;
                li.addEventListener('click', () => {
                    this.createColumnFilterElem(table, col, li, true);
                });
                ul.appendChild(li);
            }
            this.tablesContainer.append(title);
            this.tablesContainer.append(ul);
        }
        createColumnFilterElem(table, column, colElem, forSubQuery) {
            for (const elem of document.querySelectorAll('.where_input')) {
                elem.remove();
            }
            const inputElem = QB.DocElemHelper.newElemWithClass('input', 'where_input');
            inputElem.type = 'text';
            const onSubmitFilter = () => {
                try {
                    this.sqlTypeHandler.validateColumnFilterElem(table, column, inputElem.value);
                }
                catch (e) {
                    window.alert(e.message);
                    return;
                }
                this.queryService.updateQuery(query => {
                    if (forSubQuery) {
                        query.addFilterToSubQuery(column, inputElem.value);
                    }
                    else {
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
            const okBtn = QB.DocElemHelper.newElemWithClass('button', 'where_input');
            okBtn.innerText = 'Go';
            okBtn.addEventListener('click', () => {
                onSubmitFilter();
            });
            inputElem.after(okBtn);
        }
        // Defines the CSS class name(s) when a related column is shown. You can override this function to show all
        // columns the same or to have custom behavior, e.g. to check for past (table, column) combinations and not just
        // past tables as is currently implemented.
        getClassForRelatedColumn(table, column) {
            for (const pastColumn of this.queryService.getPastColumns()) {
                if (pastColumn.table === table) {
                    return 'rc-past';
                }
            }
            return 'rc-new';
        }
        collectRelatedColumns(curTable) {
            const references = [];
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
        showRelatedColumns(curTable) {
            const references = this.collectRelatedColumns(curTable);
            this.aggregateButton.show();
            this.tablesContainer.innerHTML = '<h3>Join/subquery table</h3>';
            const ul = QB.DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);
            references.forEach(ref => {
                const li = document.createElement('li');
                if (this.queryService.showWhereQueryInButton()) {
                    const btnWhereIn = QB.DocElemHelper.newElemWithText('button', '⊆');
                    btnWhereIn.title = 'keep current table, filter by this table';
                    btnWhereIn.addEventListener('click', () => {
                        this.onClickWhereIn(ref.sourceColumn, ref.targetTable, ref.targetColumn);
                    });
                    li.append(btnWhereIn);
                }
                const btnLeftJoin = QB.DocElemHelper.newElemWithText('button', '⟕');
                btnLeftJoin.title = 'Left join';
                btnLeftJoin.addEventListener('click', () => {
                    this.onClickLeftJoinColumn(curTable, ref.sourceColumn, ref.targetTable, ref.targetColumn);
                });
                li.append(btnLeftJoin);
                const spanWithTableColumn = QB.DocElemHelper.newElemWithClass('span', 'clicky');
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
        showLeftJoinColumns() {
            const tables = this.queryService.collectTopLevelTables();
            this.aggregateButton.show();
            let references = [];
            tables.forEach(activeTable => {
                references.push(...this.collectRelatedColumns(activeTable));
            });
            references = references.filter(ref => !tables.has(ref.sourceTable) || !tables.has(ref.targetTable));
            this.tablesContainer.innerHTML = '<h3>Left join</h3>';
            const ul = QB.DocElemHelper.newElemWithClass('ul', 'table-list');
            this.tablesContainer.append(ul);
            references.forEach(ref => {
                const li = document.createElement('li');
                const spanWithTableColumn = QB.DocElemHelper.newElemWithClass('span', 'clicky');
                const cssClass = this.getClassForRelatedColumn(ref.targetTable, ref.targetColumn);
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
            const columnElem = this.selectColumnMenu.generateColumnsButtonOrList();
            this.tablesContainer.append(columnElem);
        }
        onClickLeftJoinColumn(sourceTable, sourceColumn, targetTable, targetColumn) {
            this.queryService.updateQuery(query => {
                query.addLeftJoin(sourceTable, sourceColumn, targetTable, targetColumn);
                this.showLeftJoinColumns();
            });
        }
        /**
         * Click handler of a "related column" that is shown after an initial table has been selected.
         *
         * Changes the current query to a subquery filtering the given (parentTable, parentColumn), so that the new
         * query is: <code>SELECT * FROM parentTable WHERE parentColumn IN (SELECT sourceColumn FROM {query})</code>.
         */
        onClickReferenceColumn(sourceColumn, parentTable, parentColumn) {
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
        onClickWhereIn(sourceColumn, subqueryTable, subqueryColumn) {
            this.queryService.updateQuery(query => {
                query.addSubQuery(sourceColumn, subqueryTable, subqueryColumn);
                this.showRelatedColumns(query.getCurrentSelectedTable());
                this.showFilterColumnsSubQuery(subqueryTable);
                this.tablesContainer.append(this.selectColumnMenu.generateColumnsButtonOrList());
            });
        }
    }
    QB.MenuHandler = MenuHandler;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class QueryService {
        constructor(query, formatter, configDebugEnabled, configShowWhereInButton) {
            this.query = query;
            this.formatter = formatter;
            this.configDebugEnabled = configDebugEnabled;
            this.configShowWhereInButton = configShowWhereInButton;
        }
        updateQuery(queryFn) {
            queryFn(this.query);
            this.updateQueryOnPage();
        }
        collectTopLevelTables() {
            return this.query.collectTopLevelTables();
        }
        showWhereQueryInButton() {
            return this.configShowWhereInButton && !this.query.hasWhereInClause();
        }
        getPastColumns() {
            return this.query.getPastColumns();
        }
        hasColumnSelect(table, column) {
            return this.query.hasColumnSelect(table, column);
        }
        updateQueryOnPage() {
            QB.DocElemHelper.getElementById('query').innerHTML = this.formatter.generateQuery(this.query.getQuery());
            if (this.configDebugEnabled) {
                QB.DocElemHelper.getElementById('query_debug').innerHTML =
                    JSON.stringify(this.query.getQuery()).replaceAll('{', '{ ');
            }
        }
    }
    QB.QueryService = QueryService;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class QueryState {
        constructor() {
            this.pastColumns = new Set();
        }
        clearState() {
            this.query = undefined;
            this.pastColumns = new Set();
        }
        selectTable(table) {
            this.query = { table };
            this.pastColumns.add({ table: table, column: '' });
        }
        selectTableWithFilter(table, column, filter) {
            this.query = {
                table,
                where: { column, filter }
            };
            this.pastColumns.add({ table, column });
        }
        addFilterToSubQuery(column, filter) {
            if (!this.query?.sub) {
                throw new Error('Expect subquery to be set!');
            }
            this.query.sub.where = { column, filter };
            this.pastColumns.add({
                table: this.query.sub.table,
                column: column
            });
        }
        addSuperQuery(column, parentTable, parentColumn) {
            if (!this.query) {
                throw new Error('Query must be defined');
            }
            this.query.select = [{
                    table: this.query.table,
                    column: column
                }];
            this.query.aggregate = false;
            this.query = {
                table: parentTable,
                subqueryFilterColumn: parentColumn,
                sub: this.query
            };
            this.pastColumns.add({ table: this.query.sub.table, column: column });
        }
        addSubQuery(column, childTable, childColumn) {
            if (!this.query) {
                throw new Error('Query must be defined');
            }
            this.query.subqueryFilterColumn = column;
            this.query.sub = {
                select: [{ column: childColumn, table: childTable }],
                table: childTable
            };
            this.pastColumns.add({ table: childTable, column: childColumn });
        }
        addLeftJoin(sourceTable, sourceColumn, targetTable, targetColumn) {
            if (!this.query.leftJoin) {
                this.query.leftJoin = [];
            }
            this.query.leftJoin.push({
                sourceTable, sourceColumn, targetTable, targetColumn
            });
        }
        setAggregate(aggregate) {
            this.query.aggregate = aggregate;
        }
        clearColumnSelects() {
            this.query.select = [];
        }
        addColumnSelect(table, column) {
            if (!this.query.select) {
                this.query.select = [];
            }
            this.query.select.push({ table, column });
        }
        // ---------
        // Getters
        // ---------
        getCurrentSelectedTable() {
            return this.query.table;
        }
        collectTopLevelTables() {
            const tables = new Set();
            tables.add(this.query.table);
            if (this.query.leftJoin) {
                for (const leftJoin of this.query.leftJoin) {
                    tables.add(leftJoin.sourceTable);
                    tables.add(leftJoin.targetTable);
                }
            }
            return tables;
        }
        hasWhereInClause() {
            return !!this.query?.subqueryFilterColumn;
        }
        hasColumnSelect(table, column) {
            if (!this.query || !this.query.select) {
                return false;
            }
            return this.query.select.some(select => select.table === table && select.column === column);
        }
        getQuery() {
            return this.query || null;
        }
        getPastColumns() {
            return this.pastColumns;
        }
    }
    QB.QueryState = QueryState;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class SelectColumnMenu {
        constructor(queryService) {
            this.queryService = queryService;
            this.isExpanded = false;
        }
        generateColumnsButtonOrList(forceShowButton) {
            if (!this.isExpanded || forceShowButton) {
                this.isExpanded = false;
                const columnsButton = QB.DocElemHelper.newElemWithText('button', 'Select columns');
                columnsButton.addEventListener('click', () => {
                    this.isExpanded = true;
                    columnsButton.parentElement.append(this.createListElementWithSelectableColumns());
                    columnsButton.remove();
                });
                return columnsButton;
            }
            return this.createListElementWithSelectableColumns();
        }
        createListElementWithSelectableColumns() {
            const tables = this.queryService.collectTopLevelTables();
            const columns = [];
            tables.forEach(table => {
                for (const col in QB.TableDefinitions.getColumns(table)) {
                    columns.push({
                        table: table,
                        column: col,
                        active: this.queryService.hasColumnSelect(table, col)
                    });
                }
            });
            const title = QB.DocElemHelper.newElemWithText('h3', 'Select columns');
            const ul = document.createElement('ul');
            columns.forEach(col => {
                const li = QB.DocElemHelper.newElemWithClass('li', 'clicky');
                li.innerText = col.table + '.' + col.column;
                li.dataset.table = col.table;
                li.dataset.column = col.column;
                if (col.active) {
                    li.classList.add('active-column');
                }
                li.addEventListener('click', () => {
                    if (li.classList.contains('active-column')) {
                        li.classList.remove('active-column');
                    }
                    else {
                        li.classList.add('active-column');
                    }
                    this.queryService.updateQuery(query => {
                        query.clearColumnSelects();
                        for (const column of ul.children) {
                            if (column instanceof HTMLElement && column.classList.contains('active-column')) {
                                const tableTable = column.dataset.table;
                                const columnName = column.dataset.column;
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
    QB.SelectColumnMenu = SelectColumnMenu;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class SqlTypeHandler {
        formatValueForWhereClause(value, table, column) {
            const columnType = QB.TableDefinitions.getColumnType(table, column);
            switch (columnType) {
                case 'int':
                case 'tinyint':
                case 'decimal':
                case 'number':
                    return `<span class="sql-number">${value}</span>`;
                default: // quote by default
                    return `<span class="sql-text">'`
                        + this.escapeValueForSqlAndHtml(value)
                        + `'</span>`;
            }
        }
        validateColumnFilterElem(table, column, value) {
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
        escapeValueForSqlAndHtml(value) {
            return value
                .replaceAll('\'', '\'\'')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;');
        }
    }
    QB.SqlTypeHandler = SqlTypeHandler;
})(QB || (QB = {}));
var QB;
(function (QB) {
    class TableDefinitions {
        constructor() {
        }
        static init(__tables) {
            this.tables = __tables;
        }
        static getColumnType(table, column) {
            return this.tables[table].columns[column];
        }
        static getColumns(table) {
            return this.tables[table].columns;
        }
        static getReferences(table) {
            return this.tables[table].references;
        }
        static getAllTables() {
            return this.tables;
        }
    }
    QB.TableDefinitions = TableDefinitions;
})(QB || (QB = {}));
