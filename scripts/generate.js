const { readFile } = require('fs').promises;
const { join } = require('path');
const { Type, Schema, load } = require('js-yaml');
const _ = require('lodash');
const tinycolor = require('tinycolor2');

/**
 * @typedef {Object} TokenColor - Textmate token color.
 * @prop {string} [name] - Optional name.
 * @prop {string[]} scope - Array of scopes.
 * @prop {Record<'foreground'|'background'|'fontStyle',string|undefined>} settings - Textmate token settings.
 *       Note: fontStyle is a space-separated list of any of `italic`, `bold`, `underline`.
 */

/**
 * @typedef {Object} Theme - Parsed theme object.
 * @prop {Record<'base'|'ansi'|'brightOther'|'other', string[]>} dracula - Dracula color variables.
 * @prop {Record<string, string|null|undefined>} colors - VSCode color mapping.
 * @prop {TokenColor[]} tokenColors - Textmate token colors.
 */

/**
 * @typedef {(yamlObj: Theme) => Theme} ThemeTransform
 */

const withAlphaType = new Type('!alpha', {
    kind: 'sequence',
    construct: ([hexRGB, alpha]) => hexRGB + alpha,
    represent: ([hexRGB, alpha]) => hexRGB + alpha,
});

const schema = Schema.create([withAlphaType]);

/**
 * Soft variant transform.
 * @type {ThemeTransform}
 */
const transformSoft = theme => {
    /** @type {Theme} */
    const soft = JSON.parse(JSON.stringify(theme));
    const brightColors = [...soft.dracula.ansi, ...soft.dracula.brightOther];
    for (const key of Object.keys(soft.colors)) {
        if (brightColors.includes(soft.colors[key])) {
            soft.colors[key] = tinycolor(soft.colors[key])
                .desaturate(20)
                .toHexString();
        }
    }
    soft.tokenColors = soft.tokenColors.map((value) => {
        if (brightColors.includes(value.settings.foreground)) {
            value.settings.foreground = tinycolor(value.settings.foreground).desaturate(20).toHexString();
        }
        return value;
    })
    return soft;
};

module.exports = async () => {
    const yamlFile = await readFile(
        join(__dirname, '..', 'src', 'dracula.yml'),
        'utf-8'
    );

    /** @type {Theme} */
    const base = load(yamlFile, { schema });

    // Remove nulls and other falsy values from colors
    for (const key of Object.keys(base.colors)) {
        if (!base.colors[key]) {
            delete base.colors[key];
        }
    }

    const baseClone1 = _.cloneDeep(base);
    const baseClone2 = _.cloneDeep(base);
    const baseClone3 = _.cloneDeep(base);

    const nightOwlItalic = baseClone3;
    const noItalic = {
        ...baseClone2, tokenColors: baseClone2.tokenColors.filter(obj => {
            const newObj = { ...obj };
            if (newObj?.settings?.fontStyle) {
                newObj.settings.fontStyle = newObj.settings.fontStyle.replace('italic', '');
            }
            return newObj;
        })
    };

    const newBase = {
        ...baseClone3, tokenColors: baseClone3.tokenColors.filter(obj => {
            return !obj?.name?.startsWith('OM_SETTING');
        })
    };

    return {
        base: newBase,
        nightOwlItalic,
        noItalic
    };
};

module.exports();
