---
sidebar_position: 99
title: Warband Builder (Beta)
---

# The Warband Builder (Beta)
:::warning
The Warband Builder stores all data locally in your browser. If you clear your cache or browser data, **your warbands will be permanently lost**. Use the [Export function](/docs/warbands/warband-builder#export-warband) regularly to keep backups.
:::

## The Fighter Tab
---
The fighter tab contains an overview of all the fighters in your warband.

### Adding Fighters
Click Add Fighter at the bottom of the fighter table to recruit a new fighter. The available fighter types are determined by your warband's faction entry and its restrictions. Once your warband reaches its maximum size, the button will be disabled.

![](/img/add-fighter.png)

### Purchasing Equipment
Click a fighter's equipment field to open the equipment selector. All purchases follow the restrictions outlined [here](/docs/warbands/starting-warband#step-4-equipment). As weapons and equipment are assigned to a fighter, options that can no longer be taken will be greyed out automatically.

![](/img/add-equipment.png)

### Armour and Defense
A fighter's Defense value is automatically updated as armour and shields are equipped.

### Equipment and the Warband Stash
To move a piece of equipment to the Warband Stash rather than discarding it, **Ctrl+click** the item (or **Cmd+click** on Mac). When opening the equipment selector for a fighter, stashed items appear at the top of the list.

### Experience and Renown
The warband builder supports fighters gaining experience and renown.
- **Left-click** a fighter's experience value to increase it by 1.
- **Right-click** to decrease it by 1.
- At **4 XP**, Renown increases automatically and the experience value resets to 0.
- At **4 Renown**, the fighter is promoted to a `Hero` and gains access to the faction's `Hero` weapon options.

### Characteristic Increases
Fighter characteristics can be manually adjusted by **left-clicking** (increase) or **right-clicking** (decrease) the characteristic. Modified characteristics are colour-coded to indicate they have been altered from their default value. Hover over a characteristic to see a breakdown of how it has been modified.

## The Information Tab
---

### Warband Stash
Lists all equipment currently held in the stash. Stashed items count toward the warband's total value.

### Notes
A freeform text field for campaign notes, injuries, or anything else you want to track for your warband.

### Weapon Table
Automatically populated with every weapon currently equipped across your warband. Useful for a quick overview during play.

### Talents
Automatically populated with all traits, reactions, and abilities held by your fighters. If a fighter acquires another talent (such as an injury or gaining Renown), you can add it manually.

## Export Warband
---
Since warbands are stored in your browser's local storage, **regular exports are strongly recommended**. The Warband Builder exports warbands as `.json` files, which can be re-imported later to restore your data.

## Print Warband
---
Generates a printable warband roster to bring to your game session. Select **portrait orientation** for best results. A standard warband should fit neatly on a **double-sided A4** sheet.