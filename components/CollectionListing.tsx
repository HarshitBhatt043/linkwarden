import React, { useEffect, useMemo, useState } from "react";
import Tree, {
  mutateTree,
  moveItemOnTree,
  RenderItemParams,
  TreeItem,
  TreeData,
  ItemId,
  TreeSourcePosition,
  TreeDestinationPosition,
} from "@atlaskit/tree";
import { Collection } from "@prisma/client";
import Link from "next/link";
import { CollectionIncludingMembersAndLinkCount } from "@/types/global";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { useTranslation } from "next-i18next";
import { useCollections, useUpdateCollection } from "@/hooks/store/collections";
import { useUpdateUser, useUser } from "@/hooks/store/user";
import Icon from "./Icon";
import { IconWeight } from "@phosphor-icons/react";

interface ExtendedTreeItem extends TreeItem {
  data: Collection;
}

const CollectionListing = () => {
  const { t } = useTranslation();
  const updateCollection = useUpdateCollection();
  const { data: collections = [], isLoading } = useCollections();

  const { data: user = {} } = useUser();
  const updateUser = useUpdateUser();

  const router = useRouter();
  const currentPath = router.asPath;

  const [tree, setTree] = useState<TreeData | undefined>();

  const initialTree = useMemo(() => {
    if (
      // !tree &&
      collections.length > 0
    ) {
      return buildTreeFromCollections(
        collections,
        router,
        user.collectionOrder
      );
    } else return undefined;
  }, [collections, user, router]);

  useEffect(() => {
    // if (!tree)
    setTree(initialTree);
  }, [initialTree]);

  useEffect(() => {
    if (user.username) {
      if (
        (!user.collectionOrder || user.collectionOrder.length === 0) &&
        collections.length > 0
      )
        updateUser.mutate({
          ...user,
          collectionOrder: collections
            .filter(
              (e) =>
                e.parentId === null ||
                !collections.find((i) => i.id === e.parentId)
            ) // Filter out collections with non-null parentId
            .map((e) => e.id as number),
        });
      else {
        const newCollectionOrder: number[] = [...(user.collectionOrder || [])];

        // Start with collections that are in both account.collectionOrder and collections
        const existingCollectionIds = collections.map((c) => c.id as number);
        const filteredCollectionOrder = user.collectionOrder.filter((id: any) =>
          existingCollectionIds.includes(id)
        );

        // Add new collections that are not in account.collectionOrder and meet the specific conditions
        collections.forEach((collection) => {
          if (
            !filteredCollectionOrder.includes(collection.id as number) &&
            (!collection.parentId || collection.ownerId === user.id)
          ) {
            filteredCollectionOrder.push(collection.id as number);
          }
        });

        // check if the newCollectionOrder is the same as the old one
        if (
          JSON.stringify(newCollectionOrder) !==
          JSON.stringify(user.collectionOrder)
        ) {
          updateUser.mutateAsync({
            ...user,
            collectionOrder: newCollectionOrder,
          });
        }
      }
    }
  }, [collections]);

  const onExpand = (movedCollectionId: ItemId) => {
    setTree((currentTree) =>
      mutateTree(currentTree!, movedCollectionId, { isExpanded: true })
    );
  };

  const onCollapse = (movedCollectionId: ItemId) => {
    setTree((currentTree) =>
      mutateTree(currentTree as TreeData, movedCollectionId, {
        isExpanded: false,
      })
    );
  };

  const onDragEnd = async (
    source: TreeSourcePosition,
    destination: TreeDestinationPosition | undefined
  ) => {
    if (!destination || !tree) {
      return;
    }

    if (
      source.index === destination.index &&
      source.parentId === destination.parentId
    ) {
      return;
    }

    const movedCollectionId = Number(
      tree.items[source.parentId].children[source.index]
    );

    const movedCollection = collections.find((c) => c.id === movedCollectionId);

    const destinationCollection = collections.find(
      (c) => c.id === Number(destination.parentId)
    );

    if (
      (movedCollection?.ownerId !== user.id &&
        destination.parentId !== source.parentId) ||
      (destinationCollection?.ownerId !== user.id &&
        destination.parentId !== "root")
    ) {
      return toast.error(t("cant_change_collection_you_dont_own"));
    }

    setTree((currentTree) => moveItemOnTree(currentTree!, source, destination));

    const updatedCollectionOrder = [...user.collectionOrder];

    if (source.parentId !== destination.parentId) {
      await updateCollection.mutateAsync(
        {
          ...movedCollection,
          parentId:
            destination.parentId && destination.parentId !== "root"
              ? Number(destination.parentId)
              : destination.parentId === "root"
                ? "root"
                : null,
        },
        {
          onError: (error) => {
            toast.error(error.message);
          },
        }
      );
    }

    if (
      destination.index !== undefined &&
      destination.parentId === source.parentId &&
      source.parentId === "root"
    ) {
      updatedCollectionOrder.includes(movedCollectionId) &&
        updatedCollectionOrder.splice(source.index, 1);

      updatedCollectionOrder.splice(destination.index, 0, movedCollectionId);

      await updateUser.mutateAsync({
        ...user,
        collectionOrder: updatedCollectionOrder,
      });
    } else if (
      destination.index !== undefined &&
      destination.parentId === "root"
    ) {
      updatedCollectionOrder.splice(destination.index, 0, movedCollectionId);

      updateUser.mutate({
        ...user,
        collectionOrder: updatedCollectionOrder,
      });
    } else if (
      source.parentId === "root" &&
      destination.parentId &&
      destination.parentId !== "root"
    ) {
      updatedCollectionOrder.splice(source.index, 1);

      await updateUser.mutateAsync({
        ...user,
        collectionOrder: updatedCollectionOrder,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
      </div>
    );
  } else if (!tree) {
    return (
      <p className="text-neutral text-xs font-semibold truncate w-full px-2 mt-5 mb-8">
        {t("you_have_no_collections")}
      </p>
    );
  } else
    return (
      <Tree
        tree={tree}
        renderItem={(itemProps) => renderItem({ ...itemProps }, currentPath)}
        onExpand={onExpand}
        onCollapse={onCollapse}
        onDragEnd={onDragEnd}
        isDragEnabled
        isNestingEnabled
      />
    );
};

export default CollectionListing;

const renderItem = (
  { item, onExpand, onCollapse, provided }: RenderItemParams,
  currentPath: string
) => {
  const collection = item.data;

  return (
    <div ref={provided.innerRef} {...provided.draggableProps} className="mb-1">
      <div
        className={`${
          currentPath === `/collections/${collection.id}`
            ? "bg-primary/20 is-active"
            : "hover:bg-neutral/20"
        } duration-100 flex gap-1 items-center pr-2 pl-1 rounded-md`}
      >
        {Dropdown(item as ExtendedTreeItem, onExpand, onCollapse)}

        <Link
          href={`/collections/${collection.id}`}
          className="w-full"
          {...provided.dragHandleProps}
        >
          <div
            className={`py-1 cursor-pointer flex items-center gap-2 w-full rounded-md h-8 capitalize`}
          >
            {collection.icon ? (
              <Icon
                icon={collection.icon}
                size={30}
                weight={(collection.iconWeight || "regular") as IconWeight}
                color={collection.color || "#0ea5e9"}
                className="-mr-[0.15rem]"
              />
            ) : (
              <i
                className="bi-folder-fill text-2xl"
                style={{ color: collection.color || "#0ea5e9" }}
              ></i>
            )}

            <p className="truncate w-full">{collection.name}</p>

            {collection.isPublic && (
              <i
                className="bi-globe2 text-sm text-black/50 dark:text-white/50 drop-shadow"
                title="This collection is being shared publicly."
              ></i>
            )}
            <div className="drop-shadow text-neutral text-xs">
              {collection._count?.links}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

const Dropdown = (
  item: ExtendedTreeItem,
  onExpand: (id: ItemId) => void,
  onCollapse: (id: ItemId) => void
) => {
  if (item.children && item.children.length > 0) {
    return item.isExpanded ? (
      <button onClick={() => onCollapse(item.id)}>
        <div className="bi-caret-down-fill opacity-50 hover:opacity-100 duration-200"></div>
      </button>
    ) : (
      <button onClick={() => onExpand(item.id)}>
        <div className="bi-caret-right-fill opacity-40 hover:opacity-100 duration-200"></div>
      </button>
    );
  }
  // return <span>&bull;</span>;
  return <div></div>;
};

const buildTreeFromCollections = (
  collections: CollectionIncludingMembersAndLinkCount[],
  router: ReturnType<typeof useRouter>,
  order?: number[]
): TreeData => {
  if (order) {
    collections.sort((a: any, b: any) => {
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
  }

  const items: { [key: string]: ExtendedTreeItem } = collections.reduce(
    (acc: any, collection) => {
      acc[collection.id as number] = {
        id: collection.id,
        children: [],
        hasChildren: false,
        isExpanded: false,
        data: {
          id: collection.id,
          parentId: collection.parentId,
          name: collection.name,
          description: collection.description,
          color: collection.color,
          icon: collection.icon,
          iconWeight: collection.iconWeight,
          isPublic: collection.isPublic,
          ownerId: collection.ownerId,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          _count: {
            links: collection._count?.links,
          },
        },
      };
      return acc;
    },
    {}
  );

  const activeCollectionId = Number(router.asPath.split("/collections/")[1]);

  if (activeCollectionId) {
    for (const item in items) {
      const collection = items[item];
      if (Number(item) === activeCollectionId && collection.data.parentId) {
        // get all the parents of the active collection recursively until root and set isExpanded to true
        let parentId = collection.data.parentId || null;
        while (parentId && items[parentId]) {
          items[parentId].isExpanded = true;
          parentId = items[parentId].data.parentId;
        }
      }
    }
  }

  collections.forEach((collection) => {
    const parentId = collection.parentId;
    if (parentId && items[parentId] && collection.id) {
      items[parentId].children.push(collection.id);
      items[parentId].hasChildren = true;
    }
  });

  const rootId = "root";
  items[rootId] = {
    id: rootId,
    children: (collections
      .filter(
        (c) =>
          c.parentId === null || !collections.find((i) => i.id === c.parentId)
      )
      .map((c) => c.id) || "") as unknown as string[],
    hasChildren: true,
    isExpanded: true,
    data: { name: "Root" } as Collection,
  };

  return { rootId, items };
};
