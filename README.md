# Robotic Arm Trash Sorting System

## Overview
Senior design project: a robotic arm picks up trash items one-by-one and sorts them into **recycling** or **trash** using **computer vision**.

This repository contains **ALL components together**:
- CV service (detection + recyclability)
- Integration service (routing + decision + coordination)
- Arm service (pick-and-place execution)
- Dashboard (live event monitoring)

---

## Architecture

CV (TCP JSON) --> Integration (TCP JSON) --> Arm
                      |
                      +--> Dashboard (TCP event stream)

---

## Directory Structure

- `shared/` : shared protocol + parsing helpers used by every component
- `cv/` : Computer vision
- `arm/` : Arm capabilities
- `integration/` : Integration hub
- `dashboard/` : Dashboard client 

---

```bash
make
