/* eslint-disable import/no-anonymous-default-export */
// import type { Card } from "@pages/api/plain";

// export default (): Card => {
//   return {
//     key: "customer-details",
//     timeToLiveSeconds: null,
//     components: [
//       {
//         componentSpacer: {
//           spacerSize: "S",
//         },
//       },
//       {
//         componentRow: {
//           rowMainContent: [
//             {
//               componentText: {
//                 text: "Registered at",
//                 textColor: "MUTED",
//               },
//             },
//           ],
//           rowAsideContent: [
//             {
//               componentText: {
//                 text: `${DateTime.utc().minus({ month: 3, day: 2 }).toLocaleString(DateTime.DATETIME_SHORT)}`,
//               },
//             },
//           ],
//         },
//       },
//       {
//         componentSpacer: {
//           spacerSize: "M",
//         },
//       },
//       {
//         componentRow: {
//           rowMainContent: [
//             {
//               componentText: {
//                 text: "Last signed in",
//                 textColor: "MUTED",
//               },
//             },
//           ],
//           rowAsideContent: [
//             {
//               componentText: {
//                 text: `${DateTime.utc().minus({ minutes: 3 }).toLocaleString(DateTime.DATETIME_SHORT)}`,
//               },
//             },
//           ],
//         },
//       },
//       {
//         componentSpacer: {
//           spacerSize: "M",
//         },
//       },

//       {
//         componentRow: {
//           rowMainContent: [
//             {
//               componentText: {
//                 text: "Last device used",
//                 textColor: "MUTED",
//               },
//             },
//           ],
//           rowAsideContent: [
//             {
//               componentText: {
//                 text: Math.random() > 0.5 ? `iPhone 13 🍎` : `Galaxy S22  🤖`,
//               },
//             },
//           ],
//         },
//       },
//       {
//         componentSpacer: {
//           spacerSize: "M",
//         },
//       },
//       {
//         componentRow: {
//           rowMainContent: [
//             {
//               componentText: {
//                 text: "Marketing preferences",
//                 textColor: "MUTED",
//               },
//             },
//           ],
//           rowAsideContent: [
//             {
//               componentText: {
//                 text: Math.random() > 0.5 ? `Opted in 📨` : `Opted out 🙅`,
//               },
//             },
//           ],
//         },
//       },
//     ],
//   };
// };
