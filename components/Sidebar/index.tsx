import { useSession } from "next-auth/react";
import ClickAwayHandler from "@/components/ClickAwayHandler";
import { useState } from "react";
import useCollectionStore from "@/store/collections";
import { signOut } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faChevronDown,
  faFolder,
  faBox,
  faHashtag,
  faBookmark,
  faCircleUser,
  faSliders,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import SidebarItem from "./SidebarItem";
import useTagStore from "@/store/tags";
import Link from "next/link";
import Dropdown from "@/components/Dropdown";

export default function () {
  const { data: session } = useSession();

  const [collectionInput, setCollectionInput] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  const { collections, addCollection } = useCollectionStore();

  const { tags } = useTagStore();

  const user = session?.user;

  const toggleCollectionInput = () => {
    setCollectionInput(!collectionInput);
  };

  const submitCollection = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const collectionName: string = (event.target as HTMLInputElement).value;

    if (event.key === "Enter" && collectionName) {
      addCollection(collectionName);
      (event.target as HTMLInputElement).value = "";
    }
  };

  return (
    <div className="fixed bg-gray-100 top-0 bottom-0 left-0 w-80 p-5 overflow-y-auto hide-scrollbar border-solid border-r-sky-100 border z-10">
      <div className="flex gap-3 items-center mb-5 p-3 w-fit text-gray-600 relative">
        <FontAwesomeIcon icon={faCircleUser} className="h-8" />
        <div
          className="flex items-center gap-1 cursor-pointer"
          onClick={() => setProfileDropdown(!profileDropdown)}
        >
          <p>{user?.name}</p>
          <FontAwesomeIcon icon={faChevronDown} className="h-3" />
        </div>
        {profileDropdown ? (
          <Dropdown
            items={[
              {
                name: "Settings",
                icon: <FontAwesomeIcon icon={faSliders} />,
              },
              {
                name: "Logout",
                icon: <FontAwesomeIcon icon={faArrowRightFromBracket} />,
                onClick: () => {
                  signOut();
                  setProfileDropdown(!profileDropdown);
                },
              },
            ]}
            onClickOutside={() => setProfileDropdown(!profileDropdown)}
            className="absolute top-14 left-0"
          />
        ) : null}
      </div>

      <Link href="links">
        <div className="hover:bg-gray-50 hover:outline outline-sky-100 outline-1 duration-100 text-sky-900 rounded my-1 p-3 cursor-pointer flex items-center gap-2">
          <FontAwesomeIcon icon={faBookmark} className="w-4 text-sky-300" />
          <p>All Links</p>
        </div>
      </Link>

      <Link href="/collections">
        <div className="hover:bg-gray-50 hover:outline outline-sky-100 outline-1 duration-100 text-sky-900 rounded my-1 p-3 cursor-pointer flex items-center gap-2">
          <FontAwesomeIcon icon={faBox} className="w-4 text-sky-300" />
          <p>All Collections</p>
        </div>
      </Link>

      <div className="text-gray-500 flex items-center justify-between mt-5">
        <p className="text-sm p-3">Collections</p>
        {collectionInput ? (
          <ClickAwayHandler
            onClickOutside={toggleCollectionInput}
            className="w-fit"
          >
            <input
              type="text"
              placeholder="Enter Collection Name"
              className="w-44 rounded p-2 border-sky-100 border-solid border text-sm outline-none"
              onKeyDown={submitCollection}
              autoFocus
            />
          </ClickAwayHandler>
        ) : (
          <FontAwesomeIcon
            icon={faPlus}
            onClick={toggleCollectionInput}
            className="select-none cursor-pointer p-2 w-3"
          />
        )}
      </div>
      <div>
        {collections.map((e, i) => {
          return (
            <SidebarItem
              key={i}
              text={e.name}
              icon={faFolder}
              path={`/collections/${e.id}`}
            />
          );
        })}
      </div>
      <div className="text-gray-500 flex items-center justify-between mt-5">
        <p className="text-sm p-3">Tags</p>
      </div>
      <div>
        {tags.map((e, i) => {
          return (
            <SidebarItem
              key={i}
              text={e.name}
              icon={faHashtag}
              path={`/tags/${e.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}