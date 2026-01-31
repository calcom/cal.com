FROM=$1
TO=$2

if [ -z "${FROM}" ] || [ -z "${TO}" ]; then
    echo "Skipping replacement: FROM or TO value is empty."
    exit 0
fi

if [ "${FROM}" = "${TO}" ]; then
    echo "Nothing to replace, the value is already set to ${TO}."
    exit 0
fi

echo "Replacing all statically built instances of $FROM with $TO."

for file in $(egrep -r -l "${FROM}" apps/web/.next/ apps/web/public/); do
    sed -i -e "s|$FROM|$TO|g" "$file"
done
