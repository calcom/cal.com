#!/bin/bash
# Run biome lint and show output, but always exit with success
# This allows warnings to be displayed without failing the commit
biome lint --config-path=biome-staged.json "$@"
exit 0
