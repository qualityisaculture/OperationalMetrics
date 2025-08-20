import { useState, useEffect } from 'react';
import { UserGroup, UserGroupAssignment, UserGroupState } from '../types';

const STORAGE_KEY = 'tempo-analyzer-user-groups';

const UNCATEGORISED_GROUP: UserGroup = {
  id: 'uncategorised',
  name: 'Uncategorised'
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userGroups));
  }, [userGroups]);

  // Update assignments when available users change
  useEffect(() => {
    if (availableUsers.length > 0) {
      setUserGroups(prev => {
        const existingAssignments = new Set(prev.assignments.map(a => a.fullName));
        const newAssignments = availableUsers
          .filter(user => !existingAssignments.has(user))
          .map(user => ({
            fullName: user,
            groupId: null // Default to uncategorised
          }));

        return {
          ...prev,
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
      groups: [...prev.groups, newGroup]
    }));
  };

  const updateGroup = (id: string, newName: string) => {
    if (!newName.trim() || id === 'uncategorised') return;
    
    setUserGroups(prev => ({
      ...prev,
      groups: prev.groups.map(group => 
        group.id === id ? { ...group, name: newName.trim() } : group
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
        groups: prev.groups.filter(group => group.id !== id),
        assignments: updatedAssignments
      };
    });
  };

  const assignUserToGroup = (fullName: string, groupId: string | null) => {
    setUserGroups(prev => ({
      ...prev,
      assignments: prev.assignments.map(assignment => 
        assignment.fullName === fullName 
          ? { ...assignment, groupId } 
          : assignment
      )
    }));
  };

  const getUsersInGroup = (groupId: string | null) => {
    return userGroups.assignments
      .filter(assignment => assignment.groupId === groupId)
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
