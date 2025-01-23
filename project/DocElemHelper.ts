namespace QB {

    export class DocElemHelper {

        private constructor() {
        }

        static getElementById(id: string): HTMLElement {
            const elem = document.getElementById(id);
            if (!elem) {
                throw new Error(`Failed to retrieve element with ID "${id}"`);
            }
            return elem;
        }

        static getNextElemSibling(elem: HTMLElement): Element {
            const nextSib = elem.nextElementSibling;
            if (!nextSib) {
                throw new Error('Element "' + elem + '" unexpectedly had no siblings');
            }
            return nextSib;
        }

        static newElemWithClass(tagName: string, cssClassName: string): HTMLElement {
            const elem = document.createElement(tagName);
            elem.className = cssClassName;
            return elem;
        }

        static newElemWithText(tagName: string, innerText: string): HTMLElement {
            const elem = document.createElement(tagName);
            elem.innerText = innerText;
            return elem;
        }
    }
}