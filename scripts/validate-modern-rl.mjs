#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const lectureDirectory = path.join(repositoryRoot, 'lecture', 'modern-rl');
const requiredExperimentLabels = [
  'Question',
  'Prediction',
  'Experiment',
  'Observation',
  'Interpretation',
  'Limitation'
];

const requestedChapters = process.argv.slice(2).map(normalizeChapterArgument);

if (requestedChapters.length === 0) {
  console.error('Usage: node scripts/validate-modern-rl.mjs 01 [02 ...]');
  console.error('Pass chapters explicitly; for example: 01 02 03 or chapter04 chapter05.');
  process.exit(2);
}

let failedChapters = 0;

for (const chapter of requestedChapters) {
  const result = validateChapter(chapter);
  if (result.errors.length > 0) {
    failedChapters += 1;
    console.error(`\u2717 Chapter ${chapter.number}`);
    result.errors.forEach(error => console.error(`  - ${error}`));
  } else {
    console.log(
      `\u2713 Chapter ${chapter.number} ` +
      `(${result.fragmentCount} fragments, ${result.tocTargetCount} TOC targets, ` +
      `${result.experimentCount} structured experiments, ${result.quizCount} quiz questions)`
    );
  }
}

if (failedChapters > 0) {
  console.error(`Modern RL validation failed: ${failedChapters}/${requestedChapters.length} chapter(s).`);
  process.exit(1);
}

console.log(`Modern RL validation passed: ${requestedChapters.length} chapter(s).`);

function normalizeChapterArgument(argument) {
  const match = /^(?:chapter)?(\d{1,2})$/i.exec(argument);
  if (!match) {
    console.error(`Invalid chapter "${argument}". Use 1, 01, or chapter01.`);
    process.exit(2);
  }

  const value = Number(match[1]);
  if (value < 1) {
    console.error(`Invalid chapter "${argument}". Chapter numbers start at 1.`);
    process.exit(2);
  }

  return { number: String(value).padStart(2, '0'), value };
}

function validateChapter(chapter) {
  const errors = [];
  const entryPath = path.join(lectureDirectory, `chapter${chapter.number}.html`);
  const result = {
    errors,
    fragmentCount: 0,
    tocTargetCount: 0,
    experimentCount: 0,
    quizCount: 0
  };

  if (!existsSync(entryPath)) {
    errors.push(`missing entry page: ${displayPath(entryPath)}`);
    return result;
  }

  const entryHtml = readFileSync(entryPath, 'utf8');
  validateHtmlShape(entryPath, entryHtml, errors, true);

  const stylesheetReferences = extractTagReferences(entryHtml, 'link', 'href')
    .filter(reference => localPathname(reference).endsWith('.css'));
  const scriptReferences = extractTagReferences(entryHtml, 'script', 'src')
    .filter(reference => localPathname(reference).endsWith('.js'));

  if (!stylesheetReferences.some(isLocalReference)) {
    errors.push('entry page does not reference a local stylesheet');
  }
  if (!scriptReferences.some(isLocalReference)) {
    errors.push('entry page does not reference a local script');
  }

  for (const reference of [...stylesheetReferences, ...scriptReferences]) {
    if (isLocalReference(reference)) {
      checkReferenceExists(reference, entryPath, errors, 'entry asset');
    }
  }

  const chapterScriptReference = scriptReferences.find(reference =>
    path.basename(localPathname(reference)) === `chapter${chapter.number}.js`
  );

  const fragmentDocuments = [];
  let contentReady = false;
  if (!chapterScriptReference || !isLocalReference(chapterScriptReference)) {
    errors.push(`entry page does not reference ./chapter${chapter.number}.js`);
  } else {
    const chapterScriptPath = resolveLocalReference(chapterScriptReference, entryPath);
    if (existsSync(chapterScriptPath)) {
      const chapterScript = readFileSync(chapterScriptPath, 'utf8');
      const fragmentReferences = extractFragmentReferences(chapterScript, chapter.number);

      if (fragmentReferences.length === 0) {
        errors.push(
          `${displayPath(chapterScriptPath)} does not statically reference any ` +
          `chapter${chapter.number}-*.html fragments`
        );
      }

      for (const reference of fragmentReferences) {
        const fragmentPath = resolveLocalReference(reference, chapterScriptPath);
        if (!existsSync(fragmentPath)) {
          errors.push(`missing fragment referenced by loader: ${displayPath(fragmentPath)}`);
          continue;
        }

        const html = readFileSync(fragmentPath, 'utf8');
        validateHtmlShape(fragmentPath, html, errors, false);
        fragmentDocuments.push({ path: fragmentPath, html });
      }

      contentReady = fragmentReferences.length > 0 &&
        fragmentDocuments.length === fragmentReferences.length;
    }
  }

  result.fragmentCount = fragmentDocuments.length;
  if (contentReady) {
    const combinedFragments = fragmentDocuments.map(document => document.html).join('\n');
    validateToc(entryHtml, combinedFragments, errors, result);
    validateExperiments(chapter, combinedFragments, errors, result);
    validateQuiz(combinedFragments, errors, result);
  }
  validateChapterLinks(
    [{ path: entryPath, html: entryHtml }, ...fragmentDocuments],
    errors
  );

  return result;
}

function extractTagReferences(html, tagName, attributeName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern))
    .map(match => getAttribute(match[0], attributeName))
    .filter(reference => reference !== null);
}

function extractFragmentReferences(script, chapterNumber) {
  const references = [];
  const stringPattern = /["'`]([^"'`\r\n]+\.html(?:\?[^"'`\r\n]*)?)["'`]/gi;

  for (const match of script.matchAll(stringPattern)) {
    const basename = path.basename(localPathname(match[1]));
    if (basename.startsWith(`chapter${chapterNumber}-`)) {
      references.push(match[1]);
    }
  }

  return [...new Set(references)];
}

function validateToc(entryHtml, fragmentHtml, errors, result) {
  const tocBlocks = extractBlocksByClass(entryHtml, 'nav', 'mrl-toc');
  if (tocBlocks.length !== 1) {
    errors.push(`expected exactly one .mrl-toc navigation, found ${tocBlocks.length}`);
    return;
  }

  const tocTargets = extractTagReferences(tocBlocks[0], 'a', 'href')
    .filter(reference => reference.startsWith('#'))
    .map(reference => decodeHash(reference.slice(1)));
  result.tocTargetCount = tocTargets.length;

  if (tocTargets.length === 0) {
    errors.push('.mrl-toc has no in-page links');
    return;
  }

  const idCounts = new Map();
  for (const tag of fragmentHtml.matchAll(/<[a-z][^>]*>/gi)) {
    const id = getAttribute(tag[0], 'id');
    if (id !== null) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`fragment id #${id} is duplicated ${count} times`);
  }

  for (const target of tocTargets) {
    if (!target) {
      errors.push('TOC contains an empty # link');
    } else if (!idCounts.has(target)) {
      errors.push(`TOC target #${target} is absent from the loaded fragments`);
    }
  }
}

function validateExperiments(chapter, fragmentHtml, errors, result) {
  const experimentBlocks = extractBlocksByClass(
    fragmentHtml,
    'dl',
    'mrl-experiment-logic'
  );
  result.experimentCount = experimentBlocks.length;

  // Chapter 01 predates the six-field experiment markup. Every later chapter
  // should contain at least one explicit experiment contract.
  if (chapter.value >= 2 && experimentBlocks.length === 0) {
    errors.push('expected at least one .mrl-experiment-logic block');
  }

  experimentBlocks.forEach((block, index) => {
    const labels = Array.from(block.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi))
      .map(match => stripMarkup(match[1]));
    if (labels.join('|') !== requiredExperimentLabels.join('|')) {
      errors.push(
        `experiment ${index + 1} fields are [${labels.join(', ')}]; expected ` +
        `[${requiredExperimentLabels.join(', ')}] in that order`
      );
    }
  });

  const toolbarCount = countTagsWithClass(fragmentHtml, 'div', 'mrl-lab-toolbar');
  if (toolbarCount > experimentBlocks.length) {
    errors.push(
      `found ${toolbarCount} interactive lab toolbar(s) but only ` +
      `${experimentBlocks.length} six-field experiment block(s)`
    );
  }
}

function validateQuiz(fragmentHtml, errors, result) {
  const quizBlocks = extractBlocksByClass(fragmentHtml, 'div', 'mrl-quiz');
  if (quizBlocks.length !== 1) {
    errors.push(`expected exactly one .mrl-quiz block, found ${quizBlocks.length}`);
    return;
  }

  const quiz = quizBlocks[0];
  const detailsCount = (quiz.match(/<details\b/gi) ?? []).length;
  const summaryCount = (quiz.match(/<summary\b/gi) ?? []).length;
  result.quizCount = detailsCount;

  if (detailsCount < 4 || detailsCount > 8) {
    errors.push(`quiz has ${detailsCount} questions; expected 4-8`);
  }
  if (summaryCount !== detailsCount) {
    errors.push(`quiz has ${detailsCount} <details> but ${summaryCount} <summary> elements`);
  }
}

function validateChapterLinks(documents, errors) {
  const checkedTargets = new Set();

  for (const document of documents) {
    const references = extractTagReferences(document.html, 'a', 'href');
    for (const reference of references) {
      if (!isLocalReference(reference)) continue;
      if (!/^chapter\d{2}\.html$/i.test(path.basename(localPathname(reference)))) continue;

      const target = resolveLocalReference(reference, document.path);
      if (checkedTargets.has(target)) continue;
      checkedTargets.add(target);
      if (!existsSync(target)) {
        errors.push(
          `chapter navigation in ${displayPath(document.path)} points to missing ` +
          `${displayPath(target)}`
        );
      }
    }
  }
}

function validateHtmlShape(filePath, html, errors, requireDocumentShell) {
  const label = displayPath(filePath);
  const trimmed = html.trim();
  if (!trimmed) {
    errors.push(`${label} is empty`);
    return;
  }

  if (/^(?:<{7}|={7}|>{7})/m.test(html)) {
    errors.push(`${label} contains an unresolved merge-conflict marker`);
  }

  const commentStarts = (html.match(/<!--/g) ?? []).length;
  const commentEnds = (html.match(/-->/g) ?? []).length;
  if (commentStarts !== commentEnds) {
    errors.push(`${label} has an unclosed HTML comment`);
  }

  if (!trimmed.endsWith('>')) {
    errors.push(`${label} appears truncated: its last non-whitespace character is not ">"`);
  }

  if (requireDocumentShell) {
    if (!/^<!doctype html>/i.test(trimmed)) errors.push(`${label} is missing <!doctype html>`);
    if (!/<\/body>\s*<\/html>\s*$/i.test(trimmed)) {
      errors.push(`${label} is missing its closing </body></html> document shell`);
    }
  }

  const withoutRawText = html
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2')
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, '$1$2');
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  const stack = [];
  const tagPattern = /<\/?([a-z][\w:-]*)\b[^>]*>/gi;

  for (const match of withoutRawText.matchAll(tagPattern)) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = /\/\s*>$/.test(fullTag) || voidElements.has(tagName);

    if (isClosing) {
      const openTag = stack.pop();
      if (!openTag || openTag.name !== tagName) {
        const expected = openTag ? `</${openTag.name}>` : 'no closing tag';
        errors.push(`${label} has unexpected </${tagName}>; expected ${expected}`);
        return;
      }
    } else if (!isSelfClosing) {
      stack.push({ name: tagName });
    }
  }

  if (stack.length > 0) {
    const openTags = stack.slice(-4).map(tag => `<${tag.name}>`).join(', ');
    errors.push(`${label} has unclosed tag(s): ${openTags}`);
  }
}

function extractBlocksByClass(html, tagName, className) {
  const blocks = [];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  let match;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match[0].startsWith('</') || !hasClass(match[0], className)) continue;

    const contentStart = tagPattern.lastIndex;
    let depth = 1;
    let nested;
    while ((nested = tagPattern.exec(html)) !== null) {
      depth += nested[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        blocks.push(html.slice(contentStart, nested.index));
        break;
      }
    }
  }

  return blocks;
}

function countTagsWithClass(html, tagName, className) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern))
    .filter(match => hasClass(match[0], className)).length;
}

function hasClass(tag, className) {
  const value = getAttribute(tag, 'class');
  return value !== null && value.split(/\s+/).includes(className);
}

function getAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    'i'
  );
  const match = pattern.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function stripMarkup(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function decodeHash(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function checkReferenceExists(reference, sourcePath, errors, kind) {
  const target = resolveLocalReference(reference, sourcePath);
  if (!existsSync(target)) {
    errors.push(`${kind} in ${displayPath(sourcePath)} is missing: ${displayPath(target)}`);
  }
}

function resolveLocalReference(reference, sourcePath) {
  let pathname = localPathname(reference);
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the literal pathname so a malformed or missing reference still fails clearly.
  }

  if (pathname.startsWith('/')) {
    return path.join(repositoryRoot, pathname.replace(/^\/+/, ''));
  }
  return path.resolve(path.dirname(sourcePath), pathname);
}

function localPathname(reference) {
  return reference.split(/[?#]/, 1)[0];
}

function isLocalReference(reference) {
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

function displayPath(filePath) {
  return path.relative(repositoryRoot, filePath) || '.';
}
