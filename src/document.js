import classList from 'dom-classlist'
import closest from 'dom-closest'
import throttle from 'lodash.throttle'
import { bind } from './dom/events'
import { getMaxHeight } from './dom/getMaxHeight'
import {
  CLASS_ACTIVE,
  CLASS_BUTTON,
  CLASS_CHANGING,
  CLASS_CONTENT,
  CLASS_FOOTNOTE,
  CLASS_FULLY_SCROLLED,
  CLASS_HOVERED,
  FOOTNOTE_BACKLINK_REF,
  FOOTNOTE_CONTENT,
  FOOTNOTE_ID,
  FOOTNOTE_MAX_HEIGHT,
  FOOTNOTE_NUMBER,
  FOOTNOTE_REF
} from './constants'

export function findOneButton (selector = '') {
  return document.querySelector(`${selector}.${CLASS_BUTTON}`)
}

export function findAllButtons (selector = '') {
  return [...document.querySelectorAll(`${selector}.${CLASS_BUTTON}`)]
}

export const findClosestButton = element => closest(element, `.${CLASS_BUTTON}`)

export function findAllPopovers (selector = '') {
  return [...document.querySelectorAll(`${selector}.${CLASS_FOOTNOTE}`)]
}

export const findClosestPopover = element => closest(element, `.${CLASS_FOOTNOTE}`)

export function findPopoverButton (popover) {
  const id = popover.getAttribute(FOOTNOTE_ID)
  return document.querySelector(`.${CLASS_BUTTON}[${FOOTNOTE_ID}="${id}"]`)
}

export function addClass (className) {
  return element => className && element && classList(element).add(className)
}

function removeClass (className) {
  return element => className && element && classList(element).remove(className)
}

function containsClass (className) {
  return element => className && element && classList(element).contains(className)
}

export const setChanging = addClass(CLASS_CHANGING)
export const unsetChanging = removeClass(CLASS_CHANGING)
export const isChanging = containsClass(CLASS_CHANGING)

export const setActive = addClass(CLASS_ACTIVE)
export const unsetActive = removeClass(CLASS_ACTIVE)
export const isActive = containsClass(CLASS_ACTIVE)

export const setHovered = addClass(CLASS_HOVERED)
export const unsetHovered = removeClass(CLASS_HOVERED)
export const isHovered = containsClass(CLASS_HOVERED)

export function activateButton (button) {
  button.setAttribute('aria-expanded', 'true')
  setActive(button)
}

export function deactivateButton (button) {
  button.setAttribute('aria-expanded', 'false')
  unsetActive(button)
  unsetHovered(button)
}

function onScrollContent (event) {
  const target = event.currentTarget
  const delta = event.type === 'wheel' ? -event.deltaY : event.wheelDelta
  const isScrollUp = delta > 0
  const height = target.clientHeight
  const popover = findClosestPopover(target)

  if (!isScrollUp && delta < height + target.scrollTop - target.scrollHeight) {
    classList(popover).add(CLASS_FULLY_SCROLLED)
    target.scrollTop = target.scrollHeight
    event.stopPropagation()
    event.preventDefault()
    return
  }

  if (isScrollUp) {
    classList(popover).remove(CLASS_FULLY_SCROLLED)

    if (target.scrollTop < delta) {
      target.scrollTop = 0
      event.stopPropagation()
      event.preventDefault()
    }
  }
}

export function insertPopover (button, render) {
  button.insertAdjacentHTML('afterend', render({
    content: button.getAttribute(FOOTNOTE_CONTENT),
    id: button.getAttribute(FOOTNOTE_ID),
    number: button.getAttribute(FOOTNOTE_NUMBER)
  }))

  const popover = button.nextElementSibling
  const content = popover.querySelector(`.${CLASS_CONTENT}`)

  popover.setAttribute(FOOTNOTE_MAX_HEIGHT, getMaxHeight(content))
  popover.style.maxWidth = document.body.clientWidth + 'px'

  bind(content, 'mousewheel', throttle(onScrollContent))
  bind(content, 'wheel', throttle(onScrollContent))

  return popover
}

export function insertBefore (link, html) {
  link.insertAdjacentHTML('beforebegin', html)
}

export function remove (element) {
  element.parentNode.removeChild(element)
}

export function getPopoverSelector (button) {
  return `[${FOOTNOTE_ID}="${button.getAttribute(FOOTNOTE_ID)}"]`
}

function getFootnoteBacklinkId (link, anchorParentSelector) {
  const parent = closest(link, anchorParentSelector)

  if (parent) {
    return parent.getAttribute('id')
  }

  const child = link.querySelector(anchorParentSelector)

  if (child) {
    return child.getAttribute('id')
  }

  return ''
}

function setLinkReferences (link, anchorParentSelector) {
  const id = getFootnoteBacklinkId(link, anchorParentSelector) || ''
  const linkId = link.getAttribute('id') || ''
  const href = '#' + link.getAttribute('href').split('#')[1]
  link.setAttribute(FOOTNOTE_REF, href)
  link.setAttribute(FOOTNOTE_BACKLINK_REF, id + linkId)
  return link
}

export function getFootnoteLinks ({
  anchorPattern,
  anchorParentSelector,
  footnoteParentClass,
  scope
}) {
  const footnoteLinkSelector = `${scope || ''} a[href*="#"]`.trim()

  return [...document.querySelectorAll(footnoteLinkSelector)]
    .filter(link => {
      const href = link.getAttribute('href')
      const rel = link.getAttribute('rel')
      const anchor = `${href}${rel != null && rel !== 'null' ? rel : ''}`

      return anchor.match(anchorPattern) &&
        !closest(link, `[class*="${footnoteParentClass}"]:not(a):not(${anchorParentSelector})`)
    })
    .map(link => setLinkReferences(link, anchorParentSelector))
}