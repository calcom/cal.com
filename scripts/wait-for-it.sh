#!/bin/sh

# The MIT License (MIT)
#
# Copyright (c) 2017 Eficode Oy
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

set -- "$@" -- "$TIMEOUT" "$QUIET" "$PROTOCOL" "$HOST" "$PORT" "$result"
TIMEOUT=15
QUIET=0
# The protocol to make the request with, either "tcp" or "http"
PROTOCOL="tcp"

echoerr() {
  if [ "$QUIET" -ne 1 ]; then printf "%s\n" "$*" 1>&2; fi
}

usage() {
  exitcode="$1"
  cat << USAGE >&2
Usage:
  $0 host:port|url [-t timeout] [-- command args]
  -q | --quiet                        Do not output any status messages
  -t TIMEOUT | --timeout=timeout      Timeout in seconds, zero for no timeout
  -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
  exit "$exitcode"
}

wait_for() {
  case "$PROTOCOL" in
    tcp)
      if ! command -v nc >/dev/null; then
        echoerr 'nc command is missing!'
        exit 1
      fi
      ;;
    wget)
      if ! command -v wget >/dev/null; then
        echoerr 'wget command is missing!'
        exit 1
      fi
      ;;
  esac

  while :; do
    case "$PROTOCOL" in
      tcp)
        nc -w 1 -z "$HOST" "$PORT" > /dev/null 2>&1
        ;;
      http)
        wget --timeout=1 -q "$HOST" -O /dev/null > /dev/null 2>&1
        ;;
      *)
        echoerr "Unknown protocol '$PROTOCOL'"
        exit 1
        ;;
    esac

    result=$?

    if [ $result -eq 0 ] ; then
      if [ $# -gt 7 ] ; then
        for result in $(seq $(($# - 7))); do
          result=$1
          shift
          set -- "$@" "$result"
        done

        TIMEOUT=$2 QUIET=$3 PROTOCOL=$4 HOST=$5 PORT=$6 result=$7
        shift 7
        exec "$@"
      fi
      exit 0
    fi

    if [ "$TIMEOUT" -le 0 ]; then
      break
    fi
    TIMEOUT=$((TIMEOUT - 1))

    sleep 1
  done
  echo "Operation timed out" >&2
  exit 1
}

while :; do
  case "$1" in
    http://*|https://*)
    HOST="$1"
    PROTOCOL="http"
    shift 1
    ;;
    *:* )
    HOST=$(printf "%s\n" "$1"| cut -d : -f 1)
    PORT=$(printf "%s\n" "$1"| cut -d : -f 2)
    shift 1
    ;;
    -q | --quiet)
    QUIET=1
    shift 1
    ;;
    -q-*)
    QUIET=0
    echoerr "Unknown option: $1"
    usage 1
    ;;
    -q*)
    QUIET=1
    result=$1
    shift 1
    set -- -"${result#-q}" "$@"
    ;;
    -t | --timeout)
    TIMEOUT="$2"
    shift 2
    ;;
    -t*)
    TIMEOUT="${1#-t}"
    shift 1
    ;;
    --timeout=*)
    TIMEOUT="${1#*=}"
    shift 1
    ;;
    --)
    shift
    break
    ;;
    --help)
    usage 0
    ;;
    -*)
    QUIET=0
    echoerr "Unknown option: $1"
    usage 1
    ;;
    *)
    QUIET=0
    echoerr "Unknown argument: $1"
    usage 1
    ;;
  esac
done

if ! [ "$TIMEOUT" -ge 0 ] 2>/dev/null; then
  echoerr "Error: invalid timeout '$TIMEOUT'"
  usage 3
fi

case "$PROTOCOL" in
  tcp)
    if [ "$HOST" = "" ] || [ "$PORT" = "" ]; then
      echoerr "Error: you need to provide a host and port to test."
      usage 2
    fi
  ;;
  http)
    if [ "$HOST" = "" ]; then
      echoerr "Error: you need to provide a host to test."
      usage 2
    fi
  ;;
esac

wait_for "$@"
