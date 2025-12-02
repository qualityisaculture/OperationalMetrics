import { useState, useEffect } from 'react';
import { UserGroup, UserGroupAssignment, UserGroupState } from '../types';

const STORAGE_KEY = 'tempo-analyzer-user-groups';

const UNCATEGORISED_GROUP: UserGroup = {
  id: 'uncategorised',
  name: 'Uncategorised'
};

// Helper function to ensure uncategorised group exists
const ensureUncategorisedGroup = (groups: UserGroup[]): UserGroup[] => {
  const hasUncategorised = groups.some(g => g.id === 'uncategorised');
  return hasUncategorised ? groups : [UNCATEGORISED_GROUP, ...groups];
};

export const useUserGroups = (availableUsers: string[]) => {
  const [userGroups, setUserGroups] = useState<UserGroupState>({
    groups: [UNCATEGORISED_GROUP],
    assignments: []
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure uncategorised group always exists
        const hasUncategorised = parsed.groups?.some((g: UserGroup) => g.id === 'uncategorised');
        if (!hasUncategorised) {
          parsed.groups = [UNCATEGORISED_GROUP, ...(parsed.groups || [])];
        }
        setUserGroups(parsed);
      } catch (error) {
        console.error('Failed to parse stored user groups:', error);
        // Fall back to default state
        setUserGroups({
          groups: [UNCATEGORISED_GROUP],
          assignments: []
        });
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const groupsToSave = ensureUncategorisedGroup(userGroups.groups);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...userGroups,
      groups: groupsToSave
    }));
  }, [userGroups]);

  // Update assignments when available users change
  useEffect(() => {
    if (availableUsers.length > 0) {
      setUserGroups(prev => {
        const groups = ensureUncategorisedGroup(prev.groups);
        
        const existingAssignments = new Set(prev.assignments.map(a => a.fullName));
        const newAssignments = availableUsers
          .filter(user => !existingAssignments.has(user))
          .map(user => ({
            fullName: user,
            groupId: null // Default to uncategorised
          }));

        return {
          ...prev,
          groups,
          assignments: [...prev.assignments, ...newAssignments]
        };
      });
    }
  }, [availableUsers]);

  const createGroup = (name: string) => {
    if (!name.trim()) return;
    
    const newGroup: UserGroup = {
      id: `group-${Date.now()}`,
      name: name.trim()
    };

    setUserGroups(prev => ({
      ...prev,
      groups: ensureUncategorisedGroup([...prev.groups, newGroup])
    }));
  };

  const updateGroup = (id: string, newName: string) => {
    if (!newName.trim() || id === 'uncategorised') return;
    
    setUserGroups(prev => ({
      ...prev,
      groups: ensureUncategorisedGroup(
        prev.groups.map(group => 
          group.id === id ? { ...group, name: newName.trim() } : group
        )
      )
    }));
  };

  const deleteGroup = (id: string) => {
    if (id === 'uncategorised') return;
    
    setUserGroups(prev => {
      // Move all users from deleted group to uncategorised
      const updatedAssignments = prev.assignments.map(assignment => 
        assignment.groupId === id ? { ...assignment, groupId: null } : assignment
      );

      return {
        ...prev,
        groups: ensureUncategorisedGroup(
          prev.groups.filter(group => group.id !== id)
        ),
        assignments: updatedAssignments
      };
    });
  };

  const assignUserToGroup = (fullName: string, groupId: string | null) => {
    setUserGroups(prev => {
      // Check if user already exists in assignments
      const userExists = prev.assignments.some(a => a.fullName === fullName);
      
      if (userExists) {
        // Update existing assignment
        return {
          ...prev,
          groups: ensureUncategorisedGroup(prev.groups),
          assignments: prev.assignments.map(assignment => 
            assignment.fullName === fullName 
              ? { ...assignment, groupId } 
              : assignment
          )
        };
      } else {
        // Add new assignment if user doesn't exist
        return {
          ...prev,
          groups: ensureUncategorisedGroup(prev.groups),
          assignments: [...prev.assignments, { fullName, groupId }]
        };
      }
    });
  };

  const getUsersInGroup = (groupId: string | null) => {
    // For uncategorised group, look for assignments with groupId === null
    const targetGroupId = groupId === 'uncategorised' ? null : groupId;
    return userGroups.assignments
      .filter(assignment => assignment.groupId === targetGroupId)
      .map(assignment => assignment.fullName);
  };

  const getGroupById = (id: string) => {
    return userGroups.groups.find(group => group.id === id);
  };

  return {
    userGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    assignUserToGroup,
    getUsersInGroup,
    getGroupById
  };
};
