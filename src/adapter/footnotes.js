import classList from 'dom-classlist'
import closest from 'dom-closest'
import siblings from 'dom-siblings'
import throttle from 'lodash.throttle'
import { bind } from './dom/events'
import { getAvailableRoom } from './dom/getAvailableRoom'
import { getMaxHeight } from './dom/getMaxHeight'
import { getStyle } from './dom/getStyle'
import { getPopoverMaxHeight, repositionPopover, repositionTooltip } from './layout'
import {
  CLASS_ACTIVE,
  CLASS_BUTTON,
  CLASS_CHANGING,
  CLASS_FOOTNOTE,
  CLASS_FULLY_SCROLLED,
  CLASS_HOVERED,
  FOOTNOTE_CONTENT,
  FOOTNOTE_ID,
  FOOTNOTE_MAX_HEIGHT,
  FOOTNOTE_NUMBER,
  CLASS_SCROLLABLE,
  CLASS_WRAPPER,
  CLASS_CONTENT
} from './constants'

function maybeCall (context, fn, ...args) {
  return typeof fn === 'function' && fn.call(context, ...args)
}

function findOne (className) {
  return (selector = '') => document.querySelector(`${selector}.${className}`)
}

function findAll (className) {
  return (selector = '') => [...document.querySelectorAll(`${selector}.${className}`)]
}

function addClass (className) {
  return element => className && element && classList(element).add(className)
}

function findPopoverContent (popover) {
  return popover.querySelector(`.${CLASS_CONTENT}`)
}

export const findClosestPopover = element => closest(element, `.${CLASS_FOOTNOTE}`)

function scrollHandler (event) {
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

const throttledScrollHandler = throttle(scrollHandler)

function createFootnote (button, popover) {
  return button && {
    blur: () => maybeCall(button, button.blur),

    activate: (render, className, onActivate) => {
      button.setAttribute('aria-expanded', 'true')
      classList(button).add(CLASS_ACTIVE)

      button.insertAdjacentHTML('afterend', render({
        content: button.getAttribute(FOOTNOTE_CONTENT),
        id: button.getAttribute(FOOTNOTE_ID),
        number: button.getAttribute(FOOTNOTE_NUMBER)
      }))

      const newPopover = button.nextElementSibling
      const content = findPopoverContent(newPopover)

      newPopover.setAttribute(FOOTNOTE_MAX_HEIGHT, getMaxHeight(content))
      newPopover.style.maxWidth = document.body.clientWidth + 'px'

      bind(content, 'mousewheel', throttledScrollHandler)
      bind(content, 'wheel', throttledScrollHandler)

      addClass(className)(newPopover)
      maybeCall(null, onActivate, newPopover, button)

      return createFootnote(button, newPopover)
    },

    dismiss: () => {
      button.setAttribute('aria-expanded', 'false')
      classList(button).remove(CLASS_ACTIVE)
      classList(button).remove(CLASS_HOVERED)
    },

    getSelector: () => `[${FOOTNOTE_ID}="${button.getAttribute(FOOTNOTE_ID)}"]`,

    hover: () => classList(button).add(CLASS_HOVERED),

    isActive: () => classList(button).contains(CLASS_ACTIVE),

    isChanging: () => classList(button).contains(CLASS_CHANGING),

    ready: () => classList(popover).add(CLASS_ACTIVE),

    remove: () => popover.parentNode.removeChild(popover),

    reposition: () => {
      const room = getAvailableRoom(button)
      const content = findPopoverContent(popover)
      const maxHeight = getPopoverMaxHeight(popover, room)

      content.style.maxHeight = maxHeight + 'px'

      repositionPopover(popover, room)

      if (parseFloat(popover.offsetHeight) <= content.scrollHeight) {
        classList(popover).add(CLASS_SCROLLABLE)
      }
    },

    resize: () => {
      const room = getAvailableRoom(button)
      const content = findPopoverContent(popover)
      const maxWidth = content.offsetWidth
      const buttonMarginLeft = parseInt(getStyle(button, 'marginLeft'), 10)
      const left = -room.leftRelative * maxWidth + buttonMarginLeft + button.offsetWidth / 2
      const wrapper = popover.querySelector(`.${CLASS_WRAPPER}`)

      popover.style.left = left + 'px'
      wrapper.style.maxWidth = maxWidth + 'px'

      repositionTooltip(popover, room.leftRelative)
    },

    startChanging: () => classList(button).add(CLASS_CHANGING),

    stopChanging: () => classList(button).remove(CLASS_CHANGING)
  }
}

export function findFootnote (selector) {
  return createFootnote(findOne(CLASS_BUTTON)(selector))
}

export function findAllFootnotes (selector) {
  return findAll(CLASS_BUTTON)(selector).map(createFootnote)
}

export function findActiveFootnotes (selector) {
  return findAll(CLASS_FOOTNOTE)(selector)
    .map(popover => {
      const button = siblings(popover, `.${CLASS_BUTTON}`)[0]
      return createFootnote(button, popover)
    })
}

export function findOtherFootnotes (footnote) {
  const selector = footnote.getSelector()
  return findAll(CLASS_FOOTNOTE)(`:not(${selector})`)
    .map(popover => {
      const button = siblings(popover, `.${CLASS_BUTTON}`)[0]
      return createFootnote(button, popover)
    })
}

export function findClosestFootnote (target) {
  const button = closest(target, `.${CLASS_BUTTON}`)
  const popover = button && siblings(button, `.${CLASS_FOOTNOTE}`)[0]
  return createFootnote(button, popover)
}

export function hasHoveredFootnotes () {
  return !!document.querySelector(`.${CLASS_BUTTON}:hover, .${CLASS_FOOTNOTE}:hover`)
}