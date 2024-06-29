package com.example.kanshi;

public abstract class GroupedListItem {
    public static final int HEADER = 0;
    public static final int ITEM = 1;
    abstract public int getType();
    abstract public boolean isNotEqual(GroupedListItem item);
}