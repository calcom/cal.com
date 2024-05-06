
import { Section } from "@components/uicomp/section"
import { EntryDate } from "@components/common-alt/entrydate"
import { Tag } from "@components/uicomp/tag"
import { getColor, parseReleaseText, Tag as ReleaseFeatureTag } from "@utils/releases"

export const ReleaseItem = ({ date, body, items, tag }) => {
  return <div className="grid md:grid-cols-4 gap-x-8 gap-y-3">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-none">
          <EntryDate date={date} format="LLLL yyyy" />
        </div>
        <div className="flex-grow" />
        <div className="flex-none">
          {tag &&
            <Tag
              label={tag}
              color={getColor(tag)}
              round
              size="xs" />
          }
        </div>
      </div>
      <div className="prose prose-neutral md:col-span-2 max-w-none mt-[-2px]">
        {body && <p className="my-0">{body}</p>}
        {items?.map(item => <p className="my-0">{item}</p>)}
      </div>
    </div>
}

export const ReleaseEntry = ({ text }) => {
  const release = parseReleaseText(text)

  if (!release) {
    return <></>
  }

  const hasFeatures = release.features?.length > 0
  const hasImprovements = release.improvements?.length > 0
  return <Section full padding="base">
    <div className="flex flex-col gap-12">
      {release.features?.length > 0 &&
        <div className="flex flex-col gap-4">
          { release.features?.map((feature, i) =>
            <ReleaseItem
              date={i===0 ? release.date : undefined}
              body={feature.body}
              tag={feature.tag}
            />
          )}
        </div>
      }
      { release.improvements?.length > 0 &&
        <ReleaseItem
          date={!hasFeatures ? release.date : undefined}
          items={release.improvements}
          tag={ReleaseFeatureTag.Improvements}
        />
      }
      { release.bugfixes?.length > 0 &&
        <ReleaseItem
          date={(!hasFeatures && !hasImprovements)
            ? release.date : undefined}
          items={release.bugfixes}
          tag={ReleaseFeatureTag.Bugfixes}
        />
      }
    </div>
  </Section>
}
