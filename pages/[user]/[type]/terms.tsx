import React from "react";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import Button from "@components/ui/Button";

const termsMock =
  "\n" +
  "\n" +
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer semper tincidunt turpis ac semper. Vivamus in diam laoreet, tempor lorem dignissim, consectetur nibh. Aenean rhoncus, felis vehicula consectetur vestibulum, quam ex auctor libero, sit amet aliquet orci magna vitae justo. Nunc efficitur urna venenatis orci sollicitudin pulvinar. Fusce consectetur porta sapien non tempor. In sapien ante, congue iaculis aliquet sed, tempus vel orci. Mauris scelerisque justo at diam feugiat euismod.\n" +
  "\n" +
  "Fusce est sem, imperdiet in aliquam sed, consequat eu nisi. Nullam feugiat, felis eget rhoncus blandit, urna odio dignissim lacus, vel consequat leo quam quis nisi. Nullam vitae nisl ac nulla porta bibendum. Sed tellus lacus, sollicitudin bibendum scelerisque id, pulvinar id odio. Maecenas bibendum posuere sapien et fringilla. Maecenas commodo orci quis ultrices lacinia. Morbi feugiat molestie dolor vitae ornare. Fusce ac turpis sagittis, aliquam risus quis, sagittis urna. Praesent finibus velit sit amet elit elementum laoreet. In ex mi, rutrum quis lectus volutpat, malesuada eleifend ex.\n" +
  "\n" +
  "Phasellus ornare diam a orci tincidunt, varius molestie ligula imperdiet. Praesent congue lorem vitae leo vehicula dignissim. Curabitur et ante ultricies, feugiat orci quis, finibus orci. Etiam ut fringilla elit. Vestibulum in aliquam quam, quis vestibulum risus. Cras ac leo et tortor volutpat condimentum. Donec sit amet felis at ipsum imperdiet tempus eu vel dui. Suspendisse at urna vestibulum justo molestie finibus non ac dui. Mauris auctor congue augue, quis ultricies nisl convallis sit amet. Curabitur convallis ullamcorper quam. In gravida tempus diam, quis venenatis mi. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. ";

export default function Terms() {
  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white">
        <AutoSchedulingHeader />
        <div className="mt-4 max-h-60 overflow-auto">
          <p className="text-sm text-gray-600">{termsMock}</p>
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4">
        <div className="flex flex-row w-full">
          <Button className="w-full mr-4 justify-center">Eu concordo</Button>
          <Button color="secondary" className="w-full justify-center">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
