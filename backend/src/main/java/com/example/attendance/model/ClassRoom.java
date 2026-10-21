package com.example.attendance.model;

import jakarta.persistence.*;

@Entity
@Table(name = "`class`", indexes = @Index(name = "idx_class_teacher", columnList = "teacher_id"))
public class ClassRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "class_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(length = 100)
    private String room;

    public ClassRoom() {
    }

    public ClassRoom(Teacher teacher, String className, String room) {
        this.teacher = teacher;
        this.className = className;
        this.room = room;
    }

    public Integer getId() { return id; }
    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
}
